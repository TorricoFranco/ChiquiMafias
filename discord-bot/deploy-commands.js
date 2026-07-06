require('dotenv').config();
const { REST, Routes } = require('discord.js');
const comandoSoporte = require('./src/commands/support.js');

const commands = [comandoSoporte.data.toJSON()];

const CLIENT_ID = '1522224957130539148'; 

const GUILD_ID = process.env.DISCORD_GUILD_ID; 

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
  try {
    console.log(`⏳ Empezando a registrar ${commands.length} comandos (/) de la aplicación.`);

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands },
    );

    console.log(`✅ ¡Comandos registrados con éxito en el servidor!`);
  } catch (error) {
    console.error('❌ Error registrando los comandos:', error);
  }
})();