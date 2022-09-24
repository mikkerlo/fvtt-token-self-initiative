Hooks.on("chatCommandsReady", chatCommands => chatCommands.registerCommand(
    chatCommands.createCommandFromData({
        commandKey: "/in",
        invokeOnCommand: (chatlog, messageText, chatdata) => {
            logger.debug("[fvtt-token-self-init] Invoked /init");
            logger.debug("[fvtt-token-self-init] " + messageText);
            let initiative = parseFloat(messageText);
            if (Number.isNaN(initiative)) {
                ui.notifications.error("[fvtt-token-self-init] Error while parsing initiative");
                logger.error("[fvtt-token-self-init] Error while parsing initiative from chat " + messageText);
                return;
            }

            let token_list = canvas.tokens.controlled.filter(token => token.inCombat);
            if (token_list.length == 0) {
                token_list = canvas.tokens.ownedTokens
                    .filter(token => token.inCombat)
                    .filter(c =>
                        c.actor.items
                            .filter(item => item.name == "SelfInitIgnore")
                            .length == 0);
            }

            if (token_list.length != 1) {
                ui.notifications.warn("[fvtt-token-self-init] Multipple tokens detected, aborting the operation");
                return;
            }

            const initiatives = token_list
                .filter(token => token.isOwner)
                .map(player_token => ({
                    "_id": player_token.id,
                    "initiative": initiative
                }));

            game.combat.updateEmbeddedDocuments("Combatant", initiatives);
        }
    })
));
