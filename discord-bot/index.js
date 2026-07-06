require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const webhookRoutes = require('./src/routes/webhook');

const app = express();
app.use(express.json());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// --- Inyección de dependencias ---
app.set('discordClient', client);

// --- Rutas ---
app.use('/api', webhookRoutes);

// --- Eventos de Discord ---
client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) await require('./src/interactions/button').handleButtonInteraction(interaction);
  if (interaction.isModalSubmit()) await require('./src/interactions/modal').handleModalSubmitInteraction(interaction);
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId.startsWith('change_status_')) {
      await handleStatusChangeInteraction(interaction);
    }
  }

  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'soporte') {
      console.log('✅ [Discord] Comando /soporte recibido!'); 
      const comandoSoporte = require('./src/commands/support.js');
      try {
        await comandoSoporte.execute(interaction);
      } catch (error) {
        console.error('❌ [Discord] Error al ejecutar el comando:', error);
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content: 'Hubo un error interno.', ephemeral: true });
        } else {
          await interaction.reply({ content: 'Hubo un error interno.', ephemeral: true });
        }
      }
    }
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.channel.isThread()) return;
  if (message.channel.parentId !== process.env.DISCORD_TICKETS_CHANNEL_ID) return;

  try {
    await fetch(`${process.env.BACKEND_URL}/api/discord/webhook/ticket/message`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-discord-bot-token': process.env.DISCORD_INTERNAL_SECRET 
      },
      body: JSON.stringify({
        ticketId: message.channel.id, 
        senderId: message.author.id,
        message: message.content,
        screenshotUrl: message.attachments.first()?.url 
      })
    });
  } catch (err) {
    console.error('Error enviando mensaje a NestJS:', err);
  }
});

client.once('ready', () => console.log(`🤖 [Discord] Bot iniciado como ${client.user.tag}`));

app.listen(process.env.PORT || 3001, () => {
  console.log(`[Express] Servidor escuchando`);
  client.login(process.env.DISCORD_BOT_TOKEN);
});

async function handleStatusChangeInteraction(interaction) {
  const ticketId = interaction.customId.replace('change_status_', '');
  const nuevoEstado = interaction.values[0]; 

  await interaction.deferReply({ ephemeral: true });

  try {
    const response = await fetch(`${process.env.BACKEND_URL}/api/discord/webhook/ticket/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'x-discord-bot-token': process.env.DISCORD_INTERNAL_SECRET 
      },
      body: JSON.stringify({
        ticketId: ticketId,
        status: nuevoEstado
      })
    });

    if (response.ok) {
      const statusLabels = {
        OPEN: '🔓 Abierto',
        UNDER_REVIEW: '🔍 En Revisión',
        RESOLVED: '✅ Resuelto',
        CLOSED: '🔒 Cerrar Ticket'
      };

      await interaction.editReply({
        content: `💼 Estado del ticket actualizado a: **${statusLabels[nuevoEstado] || nuevoEstado}** con éxito.`
      });

      await interaction.channel.send(`📢 *<@${interaction.user.id}> cambió el estado del ticket a **${statusLabels[nuevoEstado]}**.*`);
      
      if (nuevoEstado === 'CLOSED') {
        await interaction.channel.setName(`📁-cerrado-${interaction.channel.name}`);
      }

    } else {
      const errData = await response.json();
      await interaction.editReply({
        content: `❌ No se pudo actualizar en la base de datos: ${errData.message || 'Error desconocido'}`
      });
    }
  } catch (error) {
    console.error('Error al cambiar status desde Discord:', error);
    await interaction.editReply({ content: '❌ Hubo un error de red al intentar conectar con el backend.' });
  }
}