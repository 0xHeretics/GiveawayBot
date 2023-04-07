const { EmbedBuilder } = require('@discordjs/builders');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageEmbed } = require('discord.js');
const config = require('./config.json');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

client.once('ready', async () => {
    console.log('Le bot est prêt !');

    const data = {
        name: 'startgiveaway',
        description: 'Démarre un giveaway',
        options: [
            {
                type: 7, // CHANNEL
                name: 'channel',
                description: 'Le salon où annoncer le giveaway',
                required: true,
            },
            {
                type: 4, // INTEGER
                name: 'duration',
                description: 'La durée du giveaway en minutes',
                required: true,
            },
            {
                type: 3, // STRING
                name: 'prize',
                description: 'Le lot à gagner',
                required: true,
            },
            {
                type: 3, // STRING
                name: 'image',
                description: "L'URL de l'image pour l'embed (optionnel)",
                required: false,
            },
            {
                type: 4, // INTEGER
                name: 'invites',
                description: "Nombre d'invitations nécessaires pour rejoindre le giveaway (optionnel)",
                required: false,
            },
        ],
    };

    const command = await client.guilds.cache.get(config.guildId)?.commands.create(data);
    console.log(`Commande créée: ${command}`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'startgiveaway') {
        const channel = options.get('channel').channel;
        const duration = options.get('duration').value;
        const prize = options.get('prize').value;
        const imageUrl = options.get('image')?.value;
        const requiredInvites = options.get('invites')?.value;

        const button = new ButtonBuilder()
        .setCustomId(`join_giveaway:${requiredInvites || 0}`)
        .setLabel('Rejoindre le giveaway')
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder()
        .addComponents(button);

        const embed = new EmbedBuilder()
            .setTitle('Giveaway!')
            .setDescription(`Cliquez sur le bouton pour rejoindre le giveaway!`)
            .addFields([{name: 'Durée', value: `${duration} minutes`, inline: true}, {name: 'Lot', value: prize, inline: true}], {name: 'Invitations', value: `${requiredInvites || 0} invitations`, inline: true});

        if (imageUrl) {
            embed.setImage(imageUrl);
        }

        channel.send({ embeds: [embed], components: [row] });

        // Attendre la fin du giveaway et choisir un gagnant
        setTimeout(async () => {
            const messages = await channel.messages.fetch({ limit: 100 });
            const giveawayMessage = messages.find(msg => msg.components.length > 0 && msg.components[0].components[0].customId.startsWith('join_giveaway'));

            if (!giveawayMessage) return;

            const interactions = await giveawayMessage.fetchComponentInteractions(); // Récupérer les interactions liées au bouton
            const participants = interactions
            .filter(int => int.user.id !== client.user.id) // Filtrer le bot
            .map(int => int.user); // Obtenir les utilisateurs ayant interagi avec le bouton

        const winner = participants[Math.floor(Math.random() * participants.length)];

        if (!winner) {
            channel.send('Aucun participant valide, le giveaway est annulé.');
        } else {
            channel.send(`Félicitations <@${winner.id}>, vous avez gagné le giveaway !`);
        }
    }, duration * 60 * 1000);
}
});

client.on('interactionCreate', async interaction => {
if (!interaction.isButton()) return;

const buttonId = interaction.customId;
const user = interaction.user;

if (buttonId.startsWith('join_giveaway')) {
    const requiredInvites = parseInt(buttonId.split(':')[1]);

    // Vérifiez si l'utilisateur a suffisamment d'invitations
    if (requiredInvites > 0) {
        const invites = await interaction.guild.invites.fetch();
        const userInvites = invites.filter(invite => invite.inviter.id === user.id);
        const totalInvites = userInvites.reduce((total, invite) => total + invite.uses, 0);

        if (totalInvites < requiredInvites) {
            return interaction.reply({ content: `Désolé, vous n'avez pas suffisamment d'invitations pour rejoindre ce giveaway. (${totalInvites}/${requiredInvites})`, ephemeral: true });
        }
    }

    interaction.reply({ content: 'Vous avez rejoint le giveaway!', ephemeral: true });
}
});

client.login(config.token);