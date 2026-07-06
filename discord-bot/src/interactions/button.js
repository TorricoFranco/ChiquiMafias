const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

async function handleButtonInteraction(interaction) {
  const [action, reportId] = interaction.customId.split('_');

  if (action === 'ban' || action === 'mute') {
    const modal = new ModalBuilder()
      .setCustomId(`${action}_modal_${reportId}`)
      .setTitle(action === 'ban' ? 'Confirmar Ban' : 'Configurar Mute');

    const reasonInput = new TextInputBuilder()
      .setCustomId('action_reason')
      .setLabel('Razón de la sanción')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Ej: Abuso en chat, multicuentas, etc.')
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
    
    if (action === 'mute') {
      const hoursInput = new TextInputBuilder()
        .setCustomId('mute_hours')
        .setLabel('Duración (horas)')
        .setStyle(TextInputStyle.Short)
        .setValue('24')
        .setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(hoursInput));
    }

    await interaction.showModal(modal);
    return;
  }

  await enviarAccionAlBackend({
    interaction,
    reportId,
    action: action.toUpperCase(),
    reason: 'Acción directa desde panel de Discord.'
  });
}

async function enviarAccionAlBackend({ interaction, reportId, action, durationHours, reason }) {
  try {
    console.log(process.env.BACKEND_URL)
    const response = await fetch(`${process.env.BACKEND_URL}/api/discord/webhook/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-discord-bot-token': process.env.DISCORD_INTERNAL_SECRET
      },
      body: JSON.stringify({
        reportId,
        adminDiscordId: interaction.user.id,
        action,
        durationHours: durationHours ? parseInt(durationHours, 10) : undefined,
        reason
      })
    });

    if (response.ok) {
      await interaction.reply({ content: `✅ Acción **${action}** procesada con éxito en el sistema.`, ephemeral: true });
    } else {
      await interaction.reply({ content: `❌ El backend rechazó la acción o el reporte ya fue resuelto.`, ephemeral: true });
    }
  } catch (error) {
    console.error('Error enviando acción al backend:', error);
    await interaction.reply({ content: `❌ Error de conectividad con el servidor central.`, ephemeral: true });
  }
}

module.exports = { handleButtonInteraction, enviarAccionAlBackend };