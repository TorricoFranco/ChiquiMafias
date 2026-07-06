# Login temporal para obtener accessToken de un usuario admin

Este flujo es solo para desarrollo y pruebas.

## 1. Cambia el rol de tu usuario a ADMIN (si no lo es)

Puedes hacerlo con el endpoint:

```
PATCH /users/:id/role
Content-Type: application/json

{
  "role": "ADMIN"
}
```

## 2. Obtén el accessToken usando el endpoint temporal

Llama a:

```
POST /auth/dev-login
Content-Type: application/json

{
  "email": "correo@admin.com"
}
```

Donde `correo@admin.com` es el email del usuario que ya existe en la base de datos y tiene el rol ADMIN.

La respuesta será:
```json
{
  "access_token": "...",
  "user": {
    "id": "...",
    "name": "...",
    "isFirstLogin": false
  }
}
```

## 3. Usa el accessToken para endpoints protegidos

Agrega el token en el header:
```
Authorization: Bearer TU_ACCESS_TOKEN
```

---

**IMPORTANTE:**
- Este endpoint es solo para desarrollo. Elimínalo antes de producción.
- No requiere contraseña ni Google, solo el email.
