# GitFlow - Guía de Flujo de Trabajo

Este proyecto utiliza **GitFlow** como metodología de gestión de ramas para mantener un flujo de trabajo organizado y estructurado.

## 📋 Estructura de Ramas

### Ramas Principales

- **`main`**: Rama de producción. Contiene código estable y listo para producción.
- **`develop`**: Rama de desarrollo. Contiene código en desarrollo que será integrado en la próxima release.

### Ramas de Soporte

- **`feature/*`**: Nuevas funcionalidades desarrolladas a partir de `develop`
- **`release/*`**: Preparación de nuevas releases desde `develop` hacia `main`
- **`hotfix/*`**: Correcciones urgentes que se aplican directamente a `main`

## 🔄 Flujo de Trabajo

### 1. Desarrollo de Nuevas Funcionalidades (Feature)

```bash
# Crear y cambiar a una nueva rama feature
git checkout develop
git pull origin develop
git checkout -b feature/nombre-de-la-funcionalidad

# Desarrollar y hacer commits
git add .
git commit -m "feat: descripción de la funcionalidad"

# Cuando la feature esté completa, hacer merge a develop
git checkout develop
git pull origin develop
git merge feature/nombre-de-la-funcionalidad
git push origin develop

# Eliminar la rama feature (opcional)
git branch -d feature/nombre-de-la-funcionalidad
```

### 2. Preparación de Release

```bash
# Crear rama de release desde develop
git checkout develop
git pull origin develop
git checkout -b release/1.0.0

# Hacer ajustes finales, actualizar versiones, etc.
# Hacer commits de ajustes
git commit -m "chore: actualizar versión a 1.0.0"

# Merge a main y develop
git checkout main
git merge release/1.0.0
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin main --tags

git checkout develop
git merge release/1.0.0
git push origin develop

# Eliminar rama de release
git branch -d release/1.0.0
```

### 3. Hotfix (Correcciones Urgentes)

```bash
# Crear rama hotfix desde main
git checkout main
git pull origin main
git checkout -b hotfix/nombre-del-fix

# Aplicar corrección
git commit -m "fix: descripción del fix"

# Merge a main y develop
git checkout main
git merge hotfix/nombre-del-fix
git tag -a v1.0.1 -m "Hotfix version 1.0.1"
git push origin main --tags

git checkout develop
git merge hotfix/nombre-del-fix
git push origin develop

# Eliminar rama hotfix
git branch -d hotfix/nombre-del-fix
```

## 📝 Convenciones de Commits

Utilizamos **Conventional Commits** para mantener un historial claro y estructurado:

### Tipos de Commits

- **`feat`**: Nueva funcionalidad
- **`fix`**: Corrección de bug
- **`docs`**: Cambios en documentación
- **`style`**: Cambios de formato (espacios, comas, etc.)
- **`refactor`**: Refactorización de código
- **`perf`**: Mejoras de rendimiento
- **`test`**: Agregar o modificar tests
- **`chore`**: Tareas de mantenimiento (dependencias, configuraciones, etc.)
- **`build`**: Cambios en el sistema de build
- **`ci`**: Cambios en CI/CD

### Formato

```
<tipo>(<ámbito>): <descripción>

[descripción opcional más detallada]

[footer opcional]
```

### Ejemplos

```bash
feat(auth): agregar autenticación con JWT
fix(movimientos): corregir cálculo de stock
docs(api): actualizar documentación de endpoints
refactor(materiales): simplificar lógica de validación
chore(deps): actualizar dependencias de NestJS
```

## 🚀 Comandos Útiles

### Ver ramas locales y remotas
```bash
git branch -a
```

### Ver estado del repositorio
```bash
git status
```

### Ver historial de commits
```bash
git log --oneline --graph --all
```

### Sincronizar con remoto
```bash
git fetch origin
git pull origin <rama>
```

## ⚠️ Reglas Importantes

1. **Nunca hacer commit directamente en `main` o `develop`**
2. **Siempre hacer pull antes de crear una nueva rama**
3. **Mantener las ramas actualizadas con `develop` o `main`**
4. **Eliminar ramas después de hacer merge**
5. **Usar nombres descriptivos para las ramas**
6. **Escribir mensajes de commit claros y descriptivos**

## 🔒 Protección de Ramas

Se recomienda configurar protección de ramas en GitHub para:
- `main`: Requerir pull requests y aprobaciones
- `develop`: Requerir pull requests (opcional aprobaciones)

## 📚 Recursos Adicionales

- [GitFlow Workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

