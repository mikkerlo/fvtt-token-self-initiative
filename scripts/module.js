function getTokenToCombatantIds() {
    return Array.from(game.combats)
        .flatMap(c => Array.from(c.combatants))
        .map(c => ({ key: c.tokenId, val: c.id }))
        .reduce((map, obj) => map.set(obj.key, obj.val), new Map);
}

async function updateInitiative(combatantId, initiative) {
    const updateDocument = {
        "_id": combatantId,
        "initiative": initiative
    };

    try {
        await game.combat.updateEmbeddedDocuments("Combatant", [updateDocument]);
    } catch (err) {
        logger.error("Error while trying to update initiative");
        logger.error(err);
    }
}

function createDialog(combatantId, enableAlternative=true) {
    let dialogData = {
        title: "Self Initiative",
        content: "What is your initiative? <input type='number' class='initiativeValue'></input>",
        buttons: {
            setInitiative: {
                icon: '<i class="fas fa-check"></i>',
                label: "Set this value",
                callback: async rawAns => {
                    const rawInit = rawAns[0].getElementsByClassName("initiativeValue")[0].value;
                    const initiative = parseFloat(rawInit);

                    if (Number.isNaN(initiative)) {
                        ui.notifications.error("[fvtt-token-self-init] Error while parsing initiative");
                        logger.error("[fvtt-token-self-init] Error while parsing initiative from chat " + messageText);
                        return;
                    }

                    const updateDocument = {
                        "_id": combatantId,
                        "initiative": initiative
                    };

                    try {
                        await game.combat.updateEmbeddedDocuments("Combatant", [updateDocument]);
                    } catch (err) {
                        logger.error("Error while trying to update initiative");
                        logger.error(err);
                    }
                }
            }
        }
    };
    if (enableAlternative) {
        dialogData.buttons.default = {
            icon: '<i class="fas fa-times"></i>',
            label: "I want to do a default roll",
            callback: c => game.combat.rollInitiativeOld([combatantId])
        };
    }
    let dialog = new Dialog(dialogData);
    dialog.render(true);
}

function getAllowedSelectedToken() {
    const tokenList = canvas.tokens.controlled
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
        throw "Multipple tokens detected, aborting the operation";
    }

    return tokenList[0];
}

function changeRollInitiativeButtonToCustom() {
    if (game.combat.getFlag("self-player-init", "changed")) {
        game.combat.rollInitiativeOld = game.combat.rollInitiative;
        game.combat.setFlag("self-player-init", "changed", true)
    }
    game.combat.rollInitiative = combatantIds => {
        if (combatantIds.length != 1) {
            return game.combat.rollInitiativeOld(combatantIds);
        }

        createDialog(combatantIds[0]);
    }
}

function hookCallback() {
    if (!game.settings.get("self-player-init", "replaceRollInitBtn")) {
        return;
    }

    changeRollInitiativeButtonToCustom();
}

function createHooks() {
    Hooks.on("updateCombat", hookCallback);
    Hooks.on("deleteCombat", hookCallback);
    Hooks.on("createCombatant", hookCallback);
}

async function onKeybind() {
    const token = getAllowedSelectedToken();
    if (!getTokenToCombatantIds().has(token.id)) {
        await token.toggleCombat();
    }
    const tokenToCombatant = getTokenToCombatantIds();

    createDialog(tokenToCombatant.get(token.id), false);
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

            const token = getAllowedSelectedToken();

            if (!getTokenToCombatantIds().has(token.id)) {
                await token.toggleCombat();
            }

            const tokenToCombatant = getTokenToCombatantIds();
            await updateInitiative(tokenToCombatant.get(token.id), initiative);
        }
    })
));

Hooks.on("init", () => {
    game.settings.register("self-player-init", "replaceRollInitBtn", {
        name: "[Beta] Replace roll initiative button",
        hint: "Replace roll initiative button to custom one, with it players can enter their initiative values. Use with caution",
        scope: "client",     // "world" = sync to db, "client" = local storage
        config: true,
        type: Boolean,
        default: false,
        onChange: value => createHooks(),
    });

    game.keybindings.register("self-player-init", "set-initiative-selected", {
        name: "Set initiative manualy",
        hint: "Keybindig for setting an initiative for the selected token manualy.",
        editable: [{ key: "KeyI", modifiers: [] }],
        onUp: onKeybind
    });

    hookCallback();
});

createHooks();
