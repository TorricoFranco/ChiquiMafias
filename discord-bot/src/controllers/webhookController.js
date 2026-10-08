const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder, 
  StringSelectMenuOptionBuilder 
} = require('discord.js');

// El asunto y los mensajes los escribe el usuario en la web: sin esto, un "@everyone" pinguearía al staff.
const NO_MENTIONS = { parse: [] };

const handleReportAlert = async (req, res) => {
  const secret = req.headers['x-discord-bot-token'];
  if (secret !== process.env.DISCORD_INTERNAL_SECRET) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  const client = req.app.get('discordClient');
  const { reportId, reason, details } = req.body;

  try {
    const channel = await client.channels.fetch(process.env.DISCORD_MODERATION_CHANNEL_ID);
    
    const embed = new EmbedBuilder()
      .setTitle('🚨 Nuevo Reporte Recibido')
      .setColor(0xFF0000)
      .addFields(
        { name: 'ID del Reporte', value: reportId, inline: true },
        { name: 'Motivo', value: reason, inline: true },
        { name: 'Detalles', value: details || 'Sin detalles' }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`ban_${reportId}`).setLabel('Banear').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`mute_${reportId}`).setLabel('Mutear').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`warn_${reportId}`).setLabel('Aviso').setStyle(ButtonStyle.Secondary),
    );

    await channel.send({ embeds: [embed], components: [row] });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Error enviando reporte a Discord:', error);
    res.status(500).json({ error: 'Error al enviar a Discord' });
  }
};

const handleNewTicketAlert = async (req, res) => {
  const secret = req.headers['x-discord-bot-token'];
  if (secret !== process.env.DISCORD_INTERNAL_SECRET) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  const client = req.app.get('discordClient');
  const { ticketId, userId, subject, category, message: initialMessage, screenshotUrl } = req.body;

  try {
    const channel = await client.channels.fetch(process.env.DISCORD_TICKETS_CHANNEL_ID);
    
    const discordMsg = await channel.send({
      content: `🎟️ **Nuevo Ticket de Soporte**\nUsuario: <@${userId}>\nAsunto: ${subject}`,
      allowedMentions: NO_MENTIONS,
    });
    
    const thread = await discordMsg.startThread({
      name: `TKT-${ticketId.substring(0, 8)}`,
      autoArchiveDuration: 1440,
      reason: `Ticket de soporte para ${subject}`,
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`change_status_${ticketId}`) 
      .setPlaceholder('Cambiar estado del ticket...')
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel('🔍 En Revisión').setValue('UNDER_REVIEW'),
        new StringSelectMenuOptionBuilder().setLabel('✅ Resuelto').setValue('RESOLVED'),
        new StringSelectMenuOptionBuilder().setLabel('🔒 Cerrar Ticket').setValue('CLOSED'),
        new StringSelectMenuOptionBuilder().setLabel('🔓 Reabrir (Open)').setValue('OPEN')
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const threadOptions = {
      content: `📝 **Mensaje inicial:**\n${initialMessage || 'Sin mensaje.'}`,
      components: [row],
      allowedMentions: NO_MENTIONS,
    };

    if (screenshotUrl) {
      threadOptions.files = [screenshotUrl];
    }

    await thread.send(threadOptions);

    res.status(200).json({ success: true, threadId: thread.id });
  } catch (error) {
    console.error('❌ Error creando hilo de ticket:', error);
    res.status(500).json({ error: 'Error al crear el hilo en Discord' });
  }
};

const handleForwardMessage = async (req, res) => {
  const secret = req.headers['x-discord-bot-token'];
  if (secret !== process.env.DISCORD_INTERNAL_SECRET) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  const client = req.app.get('discordClient');
  const { threadId, message, screenshotUrl } = req.body;

  try {
    const thread = await client.channels.fetch(threadId);
    
    if (thread && thread.isThread()) {
      const options = {
        content: `👤 **El usuario respondió desde la Web:**\n${message}`,
        allowedMentions: NO_MENTIONS,
      };

      if (screenshotUrl) {
        options.files = [screenshotUrl];
      }

      await thread.send(options);
      return res.status(200).json({ success: true });
    } else {
      return res.status(404).json({ error: 'El hilo de Discord no fue encontrado' });
    }
  } catch (error) {
    console.error('❌ Error al reenviar mensaje al hilo de Discord:', error);
    return res.status(500).json({ error: 'Error interno en el bot' });
  }
};

module.exports = { 
  handleReportAlert, 
  handleNewTicketAlert,
  handleForwardMessage
};