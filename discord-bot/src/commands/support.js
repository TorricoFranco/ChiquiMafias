const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('soporte')
    .setDescription('Panel de administración para tickets y reportes')
    .addSubcommand(sub =>
      sub.setName('tickets')
        .setDescription('Ver los últimos tickets')
        .addStringOption(opt =>
          opt.setName('estado')
            .setDescription('Filtrar por estado')
            .addChoices(
              { name: '🔓 Abiertos (OPEN)', value: 'OPEN' },
              { name: '🔍 En Revisión (UNDER_REVIEW)', value: 'UNDER_REVIEW' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('reportes')
        .setDescription('Ver los últimos reportes')
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true }); 

    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'tickets') {
        const estado = interaction.options.getString('estado') || '';
        const url = `${process.env.BACKEND_URL}/api/discord/webhook/tickets${estado ? `?status=${estado}` : ''}`;

        const response = await fetch(url, {
          headers: { 'x-discord-bot-token': process.env.DISCORD_INTERNAL_SECRET }
        });

        if (!response.ok) throw new Error('Error al conectar con la API');
        const { data } = await response.json();

        if (data.length === 0) {
          return interaction.editReply('🎉 No hay tickets con este estado.');
        }

        const embed = new EmbedBuilder()
          .setTitle(`🎟️ Últimos Tickets ${estado ? `(${estado})` : ''}`)
          .setColor(0x0099FF);

        data.forEach(ticket => {
          const threadLink = ticket.discordThreadId ? `<#${ticket.discordThreadId}>` : 'Sin hilo en Discord';
          embed.addFields({
            name: `Ticket #${ticket.id.substring(0, 8)} - ${ticket.subject}`,
            value: `**Usuario:** ${ticket.user?.username || 'Desconocido'}\n**Estado:** ${ticket.status}\n**Ir al hilo:** ${threadLink}`
          });
        });

        await interaction.editReply({ embeds: [embed] });

      } else if (subcommand === 'reportes') {
        const response = await fetch(`${process.env.BACKEND_URL}/api/discord/webhook/reports`, {
          headers: { 'x-discord-bot-token': process.env.DISCORD_INTERNAL_SECRET }
        });

        if (!response.ok) throw new Error('Error al conectar con la API');
        const reports = await response.json();

        if (reports.length === 0) {
          return interaction.editReply('🎉 No hay reportes pendientes.');
        }

        const embed = new EmbedBuilder()
          .setTitle('🚨 Últimos Reportes')
          .setColor(0xFF0000);

        reports.forEach(report => {
          embed.addFields({
            name: `Reporte #${report.id.substring(0, 8)}`,
            value: `**Denunciante:** ${report.reporter?.username}\n**Acusado:** ${report.reported?.username}\n**Razón:** ${report.reason}`
          });
        });

        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply('❌ Hubo un problema al buscar la información.');
    }
  }
};