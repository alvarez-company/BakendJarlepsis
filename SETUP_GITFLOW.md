# 🚀 Guía de Configuración GitFlow para Backend Jarlepsis

Esta guía te ayudará a configurar y trabajar con GitFlow en el proyecto Backend Jarlepsis.

## 📋 Prerequisitos

1. Git instalado (versión 2.28 o superior)
2. Acceso al repositorio: `https://github.com/miller0702/BakendJarlepsis.git`
3. Credenciales de GitHub configuradas

## 🔧 Configuración Inicial

### 1. Verificar Estado del Repositorio

```bash
# Verificar que estás en el directorio correcto
cd backend-jarlep

# Verificar estado de Git
git status

# Verificar ramas existentes
git branch -a

# Verificar remoto configurado
git remote -v
```

### 2. Sincronizar con el Remoto

```bash
# Asegurarse de tener la última versión de develop
git checkout develop
git pull origin develop

# Asegurarse de tener la última versión de main
git checkout main
git pull origin main
git checkout develop
```

### 3. Verificar Archivos a Subir

```bash
# Ver qué archivos están siendo rastreados
git ls-files

# Verificar que no hay archivos sensibles
git ls-files | grep -E "\.env$|\.key$|\.pem$|\.cert$"

# Verificar que node_modules y dist no están en el repositorio
git ls-files | grep -E "node_modules|dist/"
```

## 📁 Archivos que DEBEN estar en el Repositorio

✅ **Archivos de código fuente:**
- `src/` - Todo el código fuente
- `package.json` y `package-lock.json` - Dependencias
- `tsconfig.json` - Configuración TypeScript
- `nest-cli.json` - Configuración NestJS
- `Dockerfile` y `docker-compose.yml` - Configuración Docker

✅ **Archivos de configuración:**
- `.env.example` - Ejemplo de variables de entorno (sin valores reales)
- `.gitignore` - Archivos a ignorar
- `.github/` - Workflows y templates de PR

✅ **Documentación:**
- `README.md` - Documentación principal
- `GITFLOW.md` - Guía de GitFlow
- `SECURITY.md` - Políticas de seguridad
- `documents/` - Documentación adicional

✅ **Scripts y migraciones:**
- `scripts/` - Scripts de utilidad
- `migrations/` - Scripts SQL de migración
- `src/migrations/` - Migraciones TypeORM

## 🚫 Archivos que NO deben estar en el Repositorio

❌ **Archivos sensibles:**
- `.env` - Variables de entorno con valores reales
- `*.key`, `*.pem`, `*.cert` - Certificados y llaves privadas
- Cualquier archivo con credenciales, tokens o secrets

❌ **Archivos generados:**
- `node_modules/` - Dependencias (se instalan con `npm install`)
- `dist/` - Código compilado
- `build/` - Archivos de build
- `coverage/` - Reportes de cobertura de tests
- `logs/` - Archivos de log

❌ **Archivos del sistema:**
- `.DS_Store` - Archivos de macOS
- `Thumbs.db` - Archivos de Windows
- `*.swp`, `*.swo` - Archivos temporales de editores

## 🔍 Verificación Pre-Commit

Antes de hacer commit, verifica:

```bash
# 1. Verificar que no hay archivos sensibles
git status
git diff --cached

# 2. Verificar que .env no está siendo rastreado
git ls-files | grep "\.env$"

# 3. Verificar que node_modules no está siendo rastreado
git ls-files | grep "node_modules"

# 4. Verificar tamaño de archivos (no subir archivos muy grandes)
find . -type f -size +10M -not -path "./node_modules/*" -not -path "./.git/*"
```

## 📝 Flujo de Trabajo con GitFlow

### Crear una Nueva Feature

```bash
# 1. Asegurarse de estar en develop y actualizado
git checkout develop
git pull origin develop

# 2. Crear nueva rama feature
git checkout -b feature/nombre-de-la-funcionalidad

# 3. Desarrollar y hacer commits
git add .
git commit -m "feat(module): descripción de la funcionalidad"

# 4. Cuando esté lista, hacer push
git push origin feature/nombre-de-la-funcionalidad

# 5. Crear Pull Request desde GitHub hacia develop
```

### Crear una Release

```bash
# 1. Desde develop, crear rama release
git checkout develop
git pull origin develop
git checkout -b release/1.0.0

# 2. Hacer ajustes finales (versiones, changelog, etc)
# 3. Hacer commits
git commit -m "chore: actualizar versión a 1.0.0"

# 4. Merge a main
git checkout main
git pull origin main
git merge release/1.0.0
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin main --tags

# 5. Merge a develop
git checkout develop
git merge release/1.0.0
git push origin develop

# 6. Eliminar rama release
git branch -d release/1.0.0
git push origin --delete release/1.0.0
```

### Crear un Hotfix

```bash
# 1. Desde main, crear rama hotfix
git checkout main
git pull origin main
git checkout -b hotfix/nombre-del-fix

# 2. Aplicar corrección
git commit -m "fix(module): descripción del fix"

# 3. Merge a main
git checkout main
git merge hotfix/nombre-del-fix
git tag -a v1.0.1 -m "Hotfix version 1.0.1"
git push origin main --tags

# 4. Merge a develop
git checkout develop
git merge hotfix/nombre-del-fix
git push origin develop

# 5. Eliminar rama hotfix
git branch -d hotfix/nombre-del-fix
git push origin --delete hotfix/nombre-del-fix
```

## 🔐 Seguridad

### Verificar que no hay secrets en el historial

Si accidentalmente subiste un archivo `.env` o credenciales:

```bash
# Verificar historial de commits
git log --all --full-history -- "*env*"

# Si encuentras commits con secrets, usar git-filter-repo o BFG Repo-Cleaner
# para limpiar el historial (¡CUIDADO! Esto reescribe el historial)
```

### Usar GitHub Secrets para CI/CD

Para variables de entorno en GitHub Actions, usar:
- Settings → Secrets and variables → Actions
- Agregar secrets necesarios
- Referenciarlos en workflows con `${{ secrets.NOMBRE_SECRET }}`

## 📊 Comandos Útiles

```bash
# Ver estado del repositorio
git status

# Ver ramas locales y remotas
git branch -a

# Ver historial de commits
git log --oneline --graph --all

# Ver diferencias
git diff

# Ver archivos rastreados
git ls-files

# Ver tamaño del repositorio
du -sh .git

# Limpiar archivos no rastreados (¡CUIDADO!)
git clean -n  # Ver qué se eliminaría
git clean -f  # Eliminar archivos no rastreados
```

## ✅ Checklist Antes de Subir

- [ ] No hay archivos `.env` en el repositorio
- [ ] No hay `node_modules/` en el repositorio
- [ ] No hay `dist/` en el repositorio
- [ ] No hay archivos con credenciales o secrets
- [ ] Los commits siguen el formato Conventional Commits
- [ ] El código pasa el linter (`npm run lint`)
- [ ] Los tests pasan (`npm run test`)
- [ ] La documentación está actualizada
- [ ] El README.md está actualizado si hay cambios importantes

## 🆘 Solución de Problemas

### Error: "remote: error: File is too large"

```bash
# Verificar archivos grandes
find . -type f -size +50M -not -path "./node_modules/*"

# Si hay archivos grandes que no deberían estar:
git rm --cached archivo-grande
echo "archivo-grande" >> .gitignore
git commit -m "chore: agregar archivo grande a .gitignore"
```

### Error: "fatal: refusing to merge unrelated histories"

```bash
# Si necesitas fusionar historiales no relacionados
git pull origin main --allow-unrelated-histories
```

### Limpiar archivos ya rastreados

```bash
# Eliminar archivo del índice pero mantenerlo localmente
git rm --cached archivo

# Agregar a .gitignore
echo "archivo" >> .gitignore

# Commit
git add .gitignore
git commit -m "chore: agregar archivo a .gitignore"
```

## 📚 Recursos Adicionales

- [Guía de GitFlow](./GITFLOW.md)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Git Best Practices](https://github.com/git/git/blob/master/Documentation/SubmittingPatches)

---

**¿Necesitas ayuda?** Consulta la documentación o contacta al equipo de desarrollo.

