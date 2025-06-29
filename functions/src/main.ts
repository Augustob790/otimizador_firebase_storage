import { onObjectFinalized } from "firebase-functions/v2/storage";
import { getStorage } from "firebase-admin/storage";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import * as path from "path";
import * as os from "os";
import * as fs from "fs/promises";

// Bibliotecas de processamento de mídia
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import ffmpeg_static from "ffmpeg-static";

// Inicializa o Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();
const logger = functions.logger;

// Configura o caminho do ffmpeg
if (ffmpeg_static) {
  ffmpeg.setFfmpegPath(ffmpeg_static);
}

// ---- FUNÇÃO PRINCIPAL COM VALIDAÇÕES COMPLETAS ----
export const processUploadedMedia = onObjectFinalized(
  {
    cpu: 1,
    memory: "1GiB",
    timeoutSeconds: 300,
    region: "us-central1",
  },
  async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    const fileSize = event.data.size;
    const metadata = event.data.metadata || {};

    // --- 1. Verificações de Guarda ---
    if (!filePath || !contentType) {
      logger.log("Saindo: filePath ou contentType ausente.");
      return;
    }    
    
    if (metadata.optimized === "true") {       
      logger.log(`O arquivo [${filePath}] já foi otimizado. Ignorando.`);
      return;
    }
    
    if (!filePath.startsWith("uploads/")) {
      logger.log(`Arquivo [${filePath}] não está na pasta 'uploads/'. Ignorando.`);
      return;
    }

    const bucket = getStorage().bucket(fileBucket);
    const fileName = path.basename(filePath);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    const tempOptimizedPath = path.join(os.tmpdir(), `opt_${fileName}`);
    const newMetadata = {
      contentType: contentType,
      metadata: {
        ...event.data.metadata,
        optimized: "true",
      },
    };

    try {
      // --- 2. VALIDAÇÃO DE ARQUIVO INVÁLIDO/CORROMPIDO ---
      logger.log(`[${filePath}] Iniciando validações...`);
      
      if (Number(fileSize) === 0) {
        throw new Error("Arquivo corrompido: tamanho zero.");
      }

      const fileExtension = path.extname(fileName).toLowerCase();
      const expectedMime: { [key: string]: string } = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".mp4": "video/mp4",
      };

      if (expectedMime[fileExtension] && expectedMime[fileExtension] !== contentType) {
        throw new Error(`Mimetype inconsistente: extensão é '${fileExtension}' mas o tipo de conteúdo é '${contentType}'.`);
      }
      logger.log(`[${filePath}] Validações iniciais aprovadas.`);

      // --- 3. Download e Otimização ---
      const isImage = contentType.startsWith("image/");
      const isVideo = contentType.startsWith("video/");

      if (!isImage && !isVideo) {
        throw new Error(`Tipo de conteúdo inválido: ${contentType}`);
      }

      await bucket.file(filePath).download({ destination: tempFilePath });

      if (isImage) {
        await sharp(tempFilePath)
          .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
          .toFormat("jpeg", { quality: 75 })
          .toFile(tempOptimizedPath);
        newMetadata.contentType = "image/jpeg";
        logger.log(`Imagem otimizada em: ${tempOptimizedPath}`);
      } else if (isVideo) {
        await new Promise<void>((resolve, reject) => {
          ffmpeg(tempFilePath)
            .outputOptions([
              "-vf", "scale='min(1280,iw)':min'(720,ih)':force_original_aspect_ratio=decrease",
              "-c:v", "libx264",      
              "-preset", "fast",       
              "-crf", "24",            
              "-c:a", "aac",           
              "-b:a", "128k",          
            ])
            .toFormat("mp4")
            .on("end", () => resolve())
            .on("error", (err) => reject(err))
            .save(tempOptimizedPath);
        });
        logger.log(`Vídeo otimizado em: ${tempOptimizedPath}`);
      }

      // --- 4. Upload do Arquivo Otimizado ---
      await bucket.upload(tempOptimizedPath, {
        destination: filePath,
        metadata: newMetadata,
      });
      logger.log(`[${filePath}] Otimização e substituição concluídas.`);

    } catch (error) {
      const reason = (error as Error).message;
      logger.error(`[${filePath}] Rejeitado. Motivo: ${reason}`);

      // --- 5. EXCLUSÃO E LOG DE MODERAÇÃO (FORMATO CORRIGIDO) ---
      let postDeleted = false;
      
      await bucket.file(filePath).delete().catch(e => logger.error(`Falha ao deletar ${filePath} do Storage`, e));

      const postsQuery = await db.collection("posts").where("mediaPath", "==", filePath).get();
      if (!postsQuery.empty) {
        const batch = db.batch();
        postsQuery.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        postDeleted = true;
      }

      await db.collection("media_moderation_logs").add({
        mediaPath: filePath,
        deletedFromStorage: true,
        postDeleted: postDeleted,
        reason: reason,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

    } finally {
      // --- 6. Limpeza dos Arquivos Temporários ---
      await Promise.all([
        fs.unlink(tempFilePath).catch(() => {}),
        fs.unlink(tempOptimizedPath).catch(() => {})
      ]);
      logger.log(`[${filePath}] Limpeza de arquivos temporários concluída.`);
    }
  }
);