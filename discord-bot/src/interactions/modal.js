const { enviarAccionAlBackend } = require('./button');

async function handleModalSubmitInteraction(interaction) {
  const customId = interaction.customId;

  if (customId.startsWith('mute_modal_')) {
    const reportId = customId.replace('mute_modal_', '');
    const durationHours = interaction.fields.getTextInputValue('mute_hours');
    const reason = interaction.fields.getTextInputValue('action_reason');

    await enviarAccionAlBackend({ interaction, reportId, action: 'MUTE', durationHours, reason });
  } 
  
  else if (customId.startsWith('ban_modal_')) {
    const reportId = customId.replace('ban_modal_', '');
    const reason = interaction.fields.getTextInputValue('action_reason');

    await enviarAccionAlBackend({ interaction, reportId, action: 'BAN', reason });
  }
}
module.exports = { handleModalSubmitInteraction };