window.IGNORE_MESSAGES = {};

window.log_messages = async function(id, token, { limit = 100, before, around } = {}) {
    const url = new URL(`${location.origin}/api/v6/channels/${id}/messages`);
    url.searchParams.set('limit', limit);
    before && url.searchParams.set('before', before);
    around && url.searchParams.set('around', around);

    const messages = await fetchJson(url, {
        headers: {
            'content-type': 'application/json',
            'authorization': token
        }
    });

    messages.reverse();

    console.log(messages[0].id);

    const logs = [];
    let head = '';

    message_loop:
    for (const message of messages) {
        const time = new Date(message.timestamp).toLocaleString();

        for (const channelId in IGNORE_MESSAGES) {
            if (channelId !== message.channel_id) continue;

            const ranges = IGNORE_MESSAGES[channelId];
            const id = BigInt(message.id);

            for (const range of ranges) {
                if (range.length === 2) {
                    if (range[0] <= id && range[1] >= id) {
                        head = (head + `\n${time} ${message.author.username}: [SECRET]`).trimStart();
                        continue message_loop;
                    }
                } else if (range.length === 1) {
                    if (range[0] <= id) {
                        head = (head + `\n${time} ${message.author.username}: [SECRET]`).trimStart();
                        continue message_loop;
                    }
                }
            }
        }

        if (message.referenced_message) {
            head = (head + `\n    ┌ ${ellipsis(message.referenced_message.content, 128)}`);
        }

        head = (head + `\n${time} ${message.author.username}: ${message.content}`).trimStart();
        head += message.attachments.map(a => '\n' + a.url).join('');

        for (const attachment of message.attachments) {
            const isImage = Boolean(attachment.width && attachment.height) && !attachment.filename.endsWith('.mp4');

            if (isImage) {
                const maxHeight = 200;
                const maxWidth = 350;
                let width = attachment.width;
                let height = attachment.height;
                if (width > maxWidth) {
                    height = Math.round(height * (maxWidth / width));
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = Math.round(width * (maxHeight / height));
                    height = maxHeight;
                }

                const url = `https://media.discordapp.net/attachments/${id}/${attachment.id}/${attachment.filename}?width=${width}&height=${height}`;


                if (head !== '') {
                    logs.push([head]);
                    head = '';
                }

                logs.push(['%c ', `background-image: url("${url}"); padding: ${height / 2}px ${width / 2}px; background-repeat: no-repeat; line-height: 0;`]);
            }
        }
    }

    if (head !== '') {
        logs.push([head]);
    }

    for (const log of logs) {
        console.log(...log);
    }

    updateStalkLog(token, 'log_messages', { id, before, around, IGNORE_MESSAGES });
};


function ellipsis(s, max) {
    if (s.length > max) {
        return s.slice(0, max - 3).trimEnd() + '...';
    } else {
        return s;
    }
}

function fetchJson(url, options) {
    return fetch(url, options).then(r => r.json());
}

function updateStalkLog() {
}

function getLogParams(...ents) {
    const styles = [];
    let s = '';

    for (const ent of ents) {
        if (ent.text) {
            s += `%c${ent.text}`;
        } else {
            s += '%c ';
        }

        let props = [];

        if (ent.style) {
            for (const k in ent.style) {
                const key = k.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
                let val = ent.style[k];

                if (typeof val === 'number') {
                    val = `${val}px`;
                }

                props.push(`${key}: ${val};`);
            }
        }

        styles.push(props.join(' '))
    }

    return [s, ...styles];
}

function logStyled(...args) {
    console.log(
        ...getLogParams(...args)
    );
}

window.log_dms = async function(token, limit = 15) {
    const channels = await fetchJson(`/api/v6/users/@me/channels`, {
        headers: {
            'content-type': 'application/json',
            'authorization': token
        }
    });

    channels.sort((c1, c2) => c2.last_message_id - c1.last_message_id);

    for (const channel of channels.slice(0, limit)) {
        const user = channel.recipients[0] || { username: '', discriminator: '0', id: '', avatar: null };
        const icon = channel.type === 3
            ? `https://cdn.discordapp.com/channel-icons/${channel.id}/${channel.icon}.png?size=16`
            : user.avatar
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=16`
                : `https://cdn.discordapp.com/embed/avatars/${Number(user.discriminator) % 5}.png`;
        const name = channel.type === 3
            ? channel.name || channel.recipients.map(user => user.username).join(', ')
            : user.username

        console.log(`%c %c ${channel.id} ${ellipsis(name, 32)}`,
            `background-image: url(${icon});
            background-size: 16px;
            padding-right: 8.5px;
            font-family: monospace;
            background-repeat: no-repeat;
            border-radius: 50%;
            line-height: 16px;`,
            'line-height: 16px;'
        );
    }

    updateStalkLog(token, 'log_dms', { limit });
};

window.log_guilds = async function(token) {
    const [guilds, settings] = await Promise.all([
        fetchJson(`/api/v6/users/@me/guilds`, {
            headers: {
                'content-type': 'application/json',
                'authorization': token
            }
        }),
        fetchJson(`/api/v6/users/@me/settings`, {
            headers: {
                'content-type': 'application/json',
                'authorization': token
            }
        })
    ]);

    for (const guild of guilds) {
        guild.index = settings.guild_positions.indexOf(guild.id)

        guild.folder = settings.guild_folders.find(folder => folder.guild_ids.includes(guild.id));

        if (guild.folder.guild_ids.length === 1) {
            guild.folder = undefined;
        }
    }

    guilds.sort((g1, g2) => g1.index - g2.index);

    for (const guild of guilds) {
        if (guild.folder) {
            if (guild.folder.guild_ids.indexOf(guild.id) === 0) {
                console.groupCollapsed(`${guild.folder.name} (${guild.folder.guild_ids.length})`);
            }
        }

        const icon = guild.icon
            ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=16`
            : '';

        logStyled(
            {
                style: {
                    backgroundImage: `url(${icon})`,
                    backgroundSize: 16,
                    paddingRight: 8.5,
                    fontFamily: 'monospace',
                    backgroundRepeat: 'no-repeat',
                    borderRadius: '50%',
                    lineHeight: 16
                }
            },
            {
                text: ` ${guild.id} ${ellipsis(guild.name, 32)}`,
                style: {
                    lineHeight: 16
                }
            }
        );
        // console.log(`%c %c ${guild.id} ${ellipsis(guild.name, 32)}`,
        //     `background-image: url(${icon});
        //     background-size: 16px;
        //     padding-right: 8.5px;
        //     font-family: monospace;
        //     background-repeat: no-repeat;
        //     border-radius: 50%;
        //     line-height: 16px;`,
        //     'line-height: 16px;'
        // );

        if (guild.folder) {
            if (guild.folder.guild_ids.indexOf(guild.id) === guild.folder.guild_ids.length - 1) {
                console.groupEnd(`${guild.folder.name} (${guild.folder.guild_ids.length})`);
            }
        }
    }

    updateStalkLog(token, 'log_guilds');
};

window.log_notes = async function(token) {
    const notes = await fetchJson(`/api/v6/users/@me/notes`, {
        headers: {
            'content-type': 'application/json',
            'authorization': token
        }
    });

    console.log(notes);
    updateStalkLog(token, 'log_notes');
};

window.log_channels = async function(guildId, token) {
    let channels = await fetchJson(`/api/v6/guilds/${guildId}/channels`, {
        headers: {
            'content-type': 'application/json',
            'authorization': token
        }
    });

    channels = channels.filter(c => c.type === 0);

    channels.sort((c1, c2) => c2.last_message_id - c1.last_message_id);

    for (const channel of channels) {
        console.log(`${channel.id} #${channel.name}`);
    }
    updateStalkLog(token, 'log_channels', { guildId });
};

window.log_status = async function(token) {
    const settings = await fetchJson(`/api/v6/users/@me/settings`, {
        headers: {
            'content-type': 'application/json',
            'authorization': token
        }
    });

    console.log(`Status: ${settings.status}`);

    if (settings.custom_status && settings.custom_status.text) {
        console.log(`Custom status: ${settings.custom_status.text}`);
    }
    updateStalkLog(token, 'log_status');
};
