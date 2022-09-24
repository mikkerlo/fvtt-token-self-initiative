function getTokenToCombatantIds() {
    return Array.from(game.combats)
        .flatMap(c => Array.from(c.combatants))
        .map(c => ({key: c.tokenId, val: c.id}))
        .reduce((map, obj) => map.set(obj.key, obj.val), new Map);
}

Hooks.on("chatCommandsReady", chatCommands => chatCommands.registerCommand(
    chatCommands.createCommandFromData({
        commandKey: "/init",
        invokeOnCommand: async (chatlog, messageText, chatdata) => {
            logger.debug("[fvtt-token-self-init] Invoked /init");
            logger.debug("[fvtt-token-self-init] " + messageText);
            let initiative = parseFloat(messageText);
            if (Number.isNaN(initiative)) {
                ui.notifications.error("[fvtt-token-self-init] Error while parsing initiative");
                logger.error("[fvtt-token-self-init] Error while parsing initiative from chat " + messageText);
                return;
            }

            let tokenList = canvas.tokens.controlled
                .filter(token => token.isOwner);

            if (tokenList.length == 0) {
                tokenList = canvas.tokens.ownedTokens
                    .filter(c =>
                        c.actor.items
                            .filter(item => item.name == "SelfInitIgnore")
                            .length == 0);
            }

            if (tokenList.length != 1) {
                ui.notifications.warn("[fvtt-token-self-init] Multipple tokens detected, aborting the operation");
                return;
            }

            const token = tokenList[0];

            if (!getTokenToCombatantIds().has(token.id)) {
                await token.toggleCombat();
            }

            const tokenToCombatant = getTokenToCombatantIds();
            const updateDocument = {
                "_id": tokenToCombatant.get(token.id),
                "initiative": initiative
            };

            try {
                await game.combat.updateEmbeddedDocuments("Combatant", [updateDocument]);
            } catch (err) {
                logger.error("Error while trying to update initiative");
                logger.error(err);
            }
        }
    })
));
