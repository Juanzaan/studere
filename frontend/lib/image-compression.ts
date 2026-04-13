/**
 * Comprime imágenes antes de guardar en localStorage
 * Reduce tamaño de archivos grandes para evitar llenar el storage
 */

export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calcular dimensiones manteniendo aspect ratio
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        // Crear canvas y redimensionar
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo crear canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a base64 con compresión
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Verificar tamaño
        const sizeKB = (dataUrl.length * 3) / 4 / 1024;
        if (sizeKB > 5 * 1024) { // >5MB incluso después de comprimir
          reject(new Error(`Imagen demasiado grande (${Math.round(sizeKB / 1024)}MB). Máximo: 5MB`));
          return;
        }
        
        resolve(dataUrl);
      };
      
      img.onerror = () => reject(new Error('Error al cargar la imagen'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
}
