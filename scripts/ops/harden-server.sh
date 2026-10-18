#!/usr/bin/env bash
# Hardening inicial de un VPS Ubuntu 22.04/24.04 limpio. Se corre UNA vez como root.
#
#   sudo ./harden-server.sh --user deploy --pubkey-file /root/mi_llave.pub [--ssh-port 22] [--swap-gb 2]
#
# Qué hace (es idempotente: se puede repetir):
#   - Actualiza paquetes y activa las actualizaciones automáticas de seguridad.
#   - Crea un usuario con sudo y le instala tu llave pública.
#   - SSH: sin root, sin contraseñas, solo llaves. Valida la configuración antes de aplicarla.
#   - Firewall UFW: bloquea todo lo entrante salvo SSH, 80 y 443.
#   - fail2ban para SSH.
#   - Swap opcional (el build de Next.js se queda sin memoria en servidores de 2 GB).
#   - Instala Docker Engine y el plugin de Compose desde el repositorio oficial.
#
# ANTES de correrlo, abrí una segunda terminal con una sesión SSH activa. Después de aplicar los
# cambios, probá entrar como el usuario nuevo desde OTRA terminal antes de cerrar la sesión de root.
set -euo pipefail

USER_NAME=""
PUBKEY_FILE=""
SSH_PORT="22"
SWAP_GB="0"

while [ $# -gt 0 ]; do
  case "$1" in
    --user) USER_NAME="$2"; shift 2 ;;
    --pubkey-file) PUBKEY_FILE="$2"; shift 2 ;;
    --ssh-port) SSH_PORT="$2"; shift 2 ;;
    --swap-gb) SWAP_GB="$2"; shift 2 ;;
    *) echo "Argumento desconocido: $1"; exit 1 ;;
  esac
done

log() { printf '\n==> %s\n' "$*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Correlo como root (sudo)."
[ -n "$USER_NAME" ] || die "Falta --user <nombre>"
[ -f "$PUBKEY_FILE" ] || die "Falta --pubkey-file con tu llave PÚBLICA (la que termina en .pub)"
grep -qE '^(ssh-(ed25519|rsa)|ecdsa-sha2-)' "$PUBKEY_FILE" || die "$PUBKEY_FILE no parece una llave pública SSH"
[[ "$SSH_PORT" =~ ^[0-9]+$ ]] || die "--ssh-port inválido"
export DEBIAN_FRONTEND=noninteractive

# --- Paquetes y actualizaciones automáticas -------------------------------------------------
log "Actualizando paquetes"
apt-get update -y
apt-get upgrade -y
apt-get install -y ufw fail2ban unattended-upgrades ca-certificates curl gnupg rsync cron

log "Activando actualizaciones automáticas de seguridad"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

# --- Usuario con sudo y llave -------------------------------------------------------------
log "Usuario $USER_NAME"
if ! id "$USER_NAME" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$USER_NAME"
fi
usermod -aG sudo "$USER_NAME"
install -d -m 700 -o "$USER_NAME" -g "$USER_NAME" "/home/$USER_NAME/.ssh"
touch "/home/$USER_NAME/.ssh/authorized_keys"
while IFS= read -r key; do
  [ -z "$key" ] && continue
  grep -qxF "$key" "/home/$USER_NAME/.ssh/authorized_keys" || echo "$key" >> "/home/$USER_NAME/.ssh/authorized_keys"
done < "$PUBKEY_FILE"
chown "$USER_NAME:$USER_NAME" "/home/$USER_NAME/.ssh/authorized_keys"
chmod 600 "/home/$USER_NAME/.ssh/authorized_keys"
# sudo sin contraseña: el usuario no tiene contraseña (solo entra con llave).
echo "$USER_NAME ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/90-$USER_NAME"
chmod 440 "/etc/sudoers.d/90-$USER_NAME"
visudo -cf "/etc/sudoers.d/90-$USER_NAME" >/dev/null || die "sudoers inválido"

# --- SSH --------------------------------------------------------------------------------
log "Endureciendo SSH (puerto $SSH_PORT)"
mkdir -p /etc/ssh/sshd_config.d
cat > /etc/ssh/sshd_config.d/99-hardening.conf <<EOF
Port $SSH_PORT
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
AllowUsers $USER_NAME
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
AllowAgentForwarding no
EOF
# Si la validación falla no se reinicia nada y la sesión actual sigue viva.
sshd -t || { rm -f /etc/ssh/sshd_config.d/99-hardening.conf; die "Configuración de sshd inválida; se revirtió"; }
systemctl reload ssh 2>/dev/null || systemctl reload sshd

# --- Firewall ---------------------------------------------------------------------------
# Ojo: Docker publica puertos saltándose UFW. Por eso el compose de producción solo publica Caddy
# (80/443); no agregues `ports:` a otros servicios. Verificalo con scripts/ops/scan-ports.sh.
log "Firewall UFW"
ufw default deny incoming
ufw default allow outgoing
ufw allow "$SSH_PORT"/tcp comment 'SSH'
ufw limit "$SSH_PORT"/tcp
ufw allow 80/tcp comment 'HTTP (Caddy)'
ufw allow 443/tcp comment 'HTTPS (Caddy)'
ufw allow 443/udp comment 'HTTP/3 (Caddy)'
ufw --force enable

# --- fail2ban ---------------------------------------------------------------------------
log "fail2ban"
cat > /etc/fail2ban/jail.d/sshd.local <<EOF
[sshd]
enabled = true
port = $SSH_PORT
maxretry = 4
findtime = 10m
bantime = 1h
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

# --- Swap (opcional) -----------------------------------------------------------------------
if [ "$SWAP_GB" -gt 0 ] && ! swapon --show | grep -q .; then
  log "Creando swap de ${SWAP_GB} GB"
  fallocate -l "${SWAP_GB}G" /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# --- Docker -------------------------------------------------------------------------------
if ! command -v docker >/dev/null; then
  log "Instalando Docker Engine"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $VERSION_CODENAME stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi
usermod -aG docker "$USER_NAME"

log "Listo"
echo "1) En OTRA terminal probá: ssh -p $SSH_PORT $USER_NAME@<ip-del-servidor>"
echo "2) Solo si entra bien, cerrá la sesión de root."
echo "3) Seguí con docs/DEPLOY.md."
ufw status verbose
