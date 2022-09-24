Hooks.on("chatCommandsReady", chatCommands => chatCommands.registerCommand(
    chatCommands.createCommandFromData({
        commandKey: "/init",
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

            const tokenToCombant = Array.from(game.combats)
                .flatMap(c => Array.from(c.combatants))
                .map(c => ({key: c.tokenId, val: c.id}))
                .reduce((map, obj) => map.set(obj.key, obj.val), new Map)

            const initiatives = token_list
                .filter(token => token.isOwner)
                .map(player_token => ({
                    "_id": tokenToCombant.get(player_token.id),
                    "initiative": initiative
                }));

            try {
                game.combat.updateEmbeddedDocuments("Combatant", initiatives);
            } catch (err) {
                logger.error("Error while trying to update initiatives");
                logger.error(err);
            }
        }
    })
));
