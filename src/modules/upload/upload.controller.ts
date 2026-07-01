import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES_CHAT, ROLES_REQUERIMIENTOS } from '../../common/constants/roles.constants';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_SIZE_EVIDENCIA = 10 * 1024 * 1024; // 10MB para evidencias
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_MIMES_EVIDENCIA = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'video/mp4', 'video/quicktime', 'video/webm',
];

@ApiTags('upload')
@ApiBearerAuth()
@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  @Post('chat')
  @Roles(...ROLES_CHAT)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIMES.includes(file.mimetype)) {
          return cb(
            new BadRequestException('Solo se permiten imágenes (JPEG, PNG, GIF, WebP).'),
            false,
          );
        }
        cb(null, true);
      },
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), 'public', 'uploads', 'chat');
          mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname) || '.jpg'}`;
          cb(null, unique);
        },
      }),
    }),
  )
  @ApiOperation({ summary: 'Subir imagen para el chat (instalación, etc.)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  uploadChatFile(@UploadedFile() file: { filename: string; originalname?: string }) {
    if (!file) {
      throw new BadRequestException('No se envió ningún archivo.');
    }
    const url = `/public/uploads/chat/${file.filename}`;
    return { url };
  }

  @Post('evidencia')
  @Roles(...ROLES_REQUERIMIENTOS)
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      limits: { fileSize: MAX_SIZE_EVIDENCIA },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIMES_EVIDENCIA.includes(file.mimetype)) {
          return cb(
            new BadRequestException('Solo se permiten imágenes, PDFs y videos (JPEG, PNG, GIF, WebP, PDF, MP4, MOV, WebM).'),
            false,
          );
        }
        cb(null, true);
      },
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), 'public', 'uploads', 'evidencias');
          mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname) || ''}`;
          cb(null, unique);
        },
      }),
    }),
  )
  @ApiOperation({ summary: 'Subir evidencias para requerimientos (imágenes, PDFs, videos)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { 
        files: { 
          type: 'array',
          items: { type: 'string', format: 'binary' }
        } 
      },
    },
  })
  uploadEvidencias(@UploadedFiles() files: Array<{ filename: string; originalname: string; mimetype: string; size: number }>) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se enviaron archivos.');
    }
    
    const uploadedFiles = files.map(file => ({
      url: `/public/uploads/evidencias/${file.filename}`,
      nombre: file.originalname,
      tipo: file.mimetype,
      tamaño: file.size,
    }));
    
    return { files: uploadedFiles };
  }
}
