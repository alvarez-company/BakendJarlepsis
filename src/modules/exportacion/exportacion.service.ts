import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import PDFDocument = require('pdfkit');
import * as fs from 'fs';
import * as path from 'path';

export interface ExportColumn {
  key: string;
  label: string;
}

export interface ExportData {
  columns: ExportColumn[];
  data: any[];
  filename?: string;
  companyInfo?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    logo?: string;
  };
}

@Injectable()
export class ExportacionService {
  private readonly defaultCompanyInfo = {
    name: 'Jarlepsis',
    address: 'Colombia',
    phone: '',
    email: '',
  };

  private getLogoPath(): string {
    // Ruta al logo en la carpeta public
    const logoPath = path.join(process.cwd(), 'public', 'image', 'logo', 'LogoColor.png');
    if (fs.existsSync(logoPath)) {
      return logoPath;
    }
    return null;
  }

  async exportToExcel(config: ExportData): Promise<Buffer> {
    const { columns, data, filename = 'export', companyInfo } = config;
    const company = { ...this.defaultCompanyInfo, ...companyInfo };

    // Crear workbook con ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    // Agregar logo si existe
    const logoPath = this.getLogoPath();
    let logoRowHeight = 0;
    let currentRow = 1;

    if (logoPath && fs.existsSync(logoPath)) {
      try {
        const imageId = workbook.addImage({
          filename: logoPath,
          extension: 'png',
        });
        
        // Insertar logo en la primera fila
        worksheet.addImage(imageId, {
          tl: { col: 0, row: 0 },
          ext: { width: 120, height: 60 }
        });
        
        // Ajustar altura de la fila para el logo
        worksheet.getRow(1).height = 60;
        logoRowHeight = 60;
        currentRow = 2;
      } catch (error) {
        // Ignorar error al cargar logo
      }
    }

    // Header con información de la empresa - diseño mejorado
    const headerStartRow = currentRow;
    const infoStartCol = logoPath ? 2 : 1;
    
    // Nombre de la empresa
    if (company.name) {
      const nameCell = worksheet.getCell(`${String.fromCharCode(64 + infoStartCol)}${currentRow}`);
      nameCell.value = company.name;
      nameCell.font = { size: 18, bold: true, color: { argb: 'FF059669' } };
      nameCell.alignment = { vertical: 'middle', horizontal: 'left' };
      // Fondo verde claro para el nombre
      nameCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0FDF4' }
      };
      currentRow++;
    }
    
    // Información de contacto
    let infoRow = currentRow;
    
    if (company.address) {
      const addressCell = worksheet.getCell(`${String.fromCharCode(64 + infoStartCol)}${infoRow}`);
      addressCell.value = `📍 ${company.address}`;
      addressCell.font = { size: 10, color: { argb: 'FF374151' } };
      addressCell.alignment = { vertical: 'middle', horizontal: 'left' };
      infoRow++;
    }
    
    if (company.phone) {
      const phoneCell = worksheet.getCell(`${String.fromCharCode(64 + infoStartCol)}${infoRow}`);
      phoneCell.value = `📞 ${company.phone}`;
      phoneCell.font = { size: 10, color: { argb: 'FF374151' } };
      phoneCell.alignment = { vertical: 'middle', horizontal: 'left' };
      infoRow++;
    }
    
    if (company.email) {
      const emailCell = worksheet.getCell(`${String.fromCharCode(64 + infoStartCol)}${infoRow}`);
      emailCell.value = `✉️ ${company.email}`;
      emailCell.font = { size: 10, color: { argb: 'FF374151' } };
      emailCell.alignment = { vertical: 'middle', horizontal: 'left' };
      infoRow++;
    }
    
    currentRow = infoRow + 1;
    
    // Fecha de generación
    const dateCell = worksheet.getCell(`A${currentRow}`);
    dateCell.value = `📅 Fecha de generación: ${new Date().toLocaleDateString('es-CO', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`;
    dateCell.font = { size: 9, italic: true, color: { argb: 'FF6B7280' } };
    currentRow += 2; // Espacio antes de la tabla

    // Línea separadora visual
    const separatorRow = worksheet.getRow(currentRow);
    columns.forEach((col, index) => {
      const cell = separatorRow.getCell(index + 1);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF059669' }
      };
    });
    separatorRow.height = 3;
    currentRow++;

    // Agregar encabezados de columnas con diseño mejorado
    const headerRow = worksheet.getRow(currentRow);
    columns.forEach((col, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = col.label;
      cell.font = { 
        bold: true, 
        size: 11,
        color: { argb: 'FFFFFFFF' } 
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF059669' } // Verde emerald
      };
      cell.alignment = { 
        vertical: 'middle', 
        horizontal: 'center',
        wrapText: true
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF047857' } },
        left: { style: 'thin', color: { argb: 'FF047857' } },
        bottom: { style: 'medium', color: { argb: 'FF047857' } },
        right: { style: 'thin', color: { argb: 'FF047857' } }
      };
    });
    headerRow.height = 30;
    currentRow++;

    // Agregar datos
    data.forEach((item, rowIndex) => {
      const row = worksheet.getRow(currentRow);
      columns.forEach((col, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        const value = item[col.key];
        
        // Convertir objetos complejos a strings
        let cellValue: any = '';
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          if ('label' in value) {
            cellValue = value.label;
          } else if ('nombre' in value) {
            cellValue = value.nombre;
          } else if (value.toString && typeof value.toString === 'function') {
            cellValue = value.toString();
          } else {
            cellValue = JSON.stringify(value);
          }
        } else if (Array.isArray(value)) {
          cellValue = value.map(v => 
            typeof v === 'object' && v !== null && 'nombre' in v ? v.nombre : String(v)
          ).join(', ');
        } else {
          cellValue = value ?? '';
        }
        
        cell.value = cellValue;
        cell.alignment = { 
          vertical: 'middle', 
          horizontal: 'left', 
          wrapText: true 
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };
        
        // Alternar colores de fila
        if (rowIndex % 2 === 0) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFB' }
          };
        } else {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFFF' }
          };
        }
      });
      row.height = 20;
      currentRow++;
    });

    // Ajustar ancho de columnas automáticamente
    columns.forEach((col, index) => {
      const column = worksheet.getColumn(index + 1);
      column.width = Math.max(15, Math.min(30, col.label.length + 5));
    });

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportToPdf(config: ExportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const { columns, data, filename = 'export', companyInfo } = config;
        const company = { ...this.defaultCompanyInfo, ...companyInfo };
        
        // Crear documento PDF con PDFKit
        const doc = new PDFDocument({ 
          margin: 50, 
          size: 'A4',
          info: {
            Title: filename,
            Author: company.name,
            Subject: 'Reporte generado automáticamente'
          }
        });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        const pageWidth = doc.page.width;
        const margin = 50;
        let yPosition = margin;

        // Header con fondo de color
        const headerHeight = 100;
        doc.rect(margin, yPosition, pageWidth - (margin * 2), headerHeight)
          .fillColor('#F0FDF4')
          .fill()
          .strokeColor('#059669')
          .lineWidth(2)
          .stroke();

        // Agregar logo si existe
        const logoPath = this.getLogoPath();
        if (logoPath && fs.existsSync(logoPath)) {
          try {
            doc.image(logoPath, margin + 10, yPosition + 10, {
              width: 100,
              height: 60,
              fit: [100, 60]
            });
          } catch (error) {
            // Ignorar error al cargar logo en PDF
          }
        }

        // Información de la empresa al lado del logo
        const textStartX = logoPath ? margin + 120 : margin + 10;
        let textY = yPosition + 15;

        // Nombre de la empresa
        doc.fontSize(22)
          .font('Helvetica-Bold')
          .fillColor('#059669')
          .text(company.name || 'Jarlepsis', textStartX, textY, {
            width: pageWidth - textStartX - margin,
            align: 'left'
          });
        textY += 25;

        // Información de contacto
        doc.fontSize(10)
          .font('Helvetica')
          .fillColor('#374151');
        
        if (company.address) {
          doc.text(`📍 ${company.address}`, textStartX, textY);
          textY += 15;
        }
        if (company.phone) {
          doc.text(`📞 ${company.phone}`, textStartX, textY);
          textY += 15;
        }
        if (company.email) {
          doc.text(`✉️ ${company.email}`, textStartX, textY);
          textY += 15;
        }

        yPosition += headerHeight + 15;

        // Fecha de generación
        doc.fontSize(9)
          .font('Helvetica-Oblique')
          .fillColor('#6B7280')
          .text(
            `📅 Fecha de generación: ${new Date().toLocaleDateString('es-CO', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}`,
            margin,
            yPosition
          );
        yPosition += 20;

        // Línea separadora decorativa
        doc.moveTo(margin, yPosition)
          .lineTo(pageWidth - margin, yPosition)
          .strokeColor('#059669')
          .lineWidth(3)
          .stroke();
        yPosition += 20;

        // Calcular ancho de columnas
        const availableWidth = pageWidth - (margin * 2);
        const columnWidth = availableWidth / columns.length;
        const startX = margin;

        // Encabezados de tabla con diseño mejorado
        doc.fontSize(10).font('Helvetica-Bold');
        let xPosition = startX;
        const headerY = yPosition;
        
        columns.forEach((col, index) => {
          // Fondo del encabezado
          doc.rect(xPosition, headerY, columnWidth, 30)
            .fillColor('#059669')
            .fill()
            .strokeColor('#047857')
            .lineWidth(1.5)
            .stroke();
          
          // Texto del encabezado
          doc.fillColor('#FFFFFF')
            .text(col.label, xPosition + 8, headerY + 10, {
              width: columnWidth - 16,
              align: 'left',
              ellipsis: true
            });
          
          xPosition += columnWidth;
        });
        yPosition += 30;

        // Datos de la tabla
        doc.fontSize(9).font('Helvetica');
        data.forEach((item, rowIndex) => {
          // Verificar si necesitamos una nueva página
          if (yPosition > 750) {
            doc.addPage();
            yPosition = 50;
          }

          xPosition = startX;
          const rowY = yPosition;
          
          columns.forEach((col, colIndex) => {
            const value = item[col.key];
            let cellValue = '';
            
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              if ('label' in value) {
                cellValue = String(value.label);
              } else if ('nombre' in value) {
                cellValue = String(value.nombre);
              } else {
                cellValue = String(value);
              }
            } else if (Array.isArray(value)) {
              cellValue = value.map(v => String(v)).join(', ');
            } else {
              cellValue = String(value ?? '');
            }

            // Fondo alternado para filas
            if (rowIndex % 2 === 0) {
              doc.rect(xPosition, rowY, columnWidth, 25)
                .fillColor('#F9FAFB')
                .fill();
            } else {
              doc.rect(xPosition, rowY, columnWidth, 25)
                .fillColor('#FFFFFF')
                .fill();
            }

            // Borde de celda
            doc.rect(xPosition, rowY, columnWidth, 25)
              .strokeColor('#E5E7EB')
              .lineWidth(0.5)
              .stroke();

            // Texto de celda
            doc.fillColor('#111827')
              .text(cellValue, xPosition + 6, rowY + 7, {
                width: columnWidth - 12,
                align: 'left',
                ellipsis: true
              });

            xPosition += columnWidth;
          });
          yPosition += 25;
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
