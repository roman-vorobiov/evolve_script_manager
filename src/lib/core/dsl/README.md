## About

The custom language (creatively named DSL) is used to generate your config. It is comprised of statements separated by newlines (newlines can still apear within list or call expressions). Some statements can be nested inside other statements.

## Simple settings

To set the value of a setting use the `setting = value` syntax. Boolean values are represented by `ON` and `OFF`. The string (or enum) values need to be quoted with `"`. As of now only the decimal number literals are supported.
If the same setting is set multiple times (outside of an `if` block) only the last assignment takes place.

```
batcity-rock_quarry = ON

prestigeType = "bioseed"
prestigeType = "mad"

foreignHireMercMoneyStoragePercent = 50
```

Gets compiled into:

```json
{
    "batcity-rock_quarry": true,
    "prestigeType": "mad",
    "foreignHireMercMoneyStoragePercent": 50
}
```

If you don't know the ID of a setting, you can check it by opening the override dialog for the setting you need through the UI (it shows the setting ID on the top) or try to guess from the list - either use the autocomplete feature or check the default [settings.json](/src/lib/assets/default.json).

## Setting prefixes

You need to refer to settings by their internal IDs. Alternatively, some of them are grouped under a common prefix and can be referred to using either `Prefix.suffix` or `Prefix[suffix]` syntax:

```
AutoBuild.city-rock_quarry = ON

AutoFoundryWeight[Plywood] = 0.5
```

```json
{

    "batcity-rock_quarry": true,
    "foundry_w_Plywood": 0.5
}
```

For the full list of built-in prefixes see [settings.ts](/src/lib/core/domain/settings.ts).
You still need to use the internal IDs for the suffix but the suggestions list shows you the actual names of the buildings, techs, etc. so you don't need to guess here.

## Bulk assignment

If you want, you can set multiple settings that use the same prefix in the same statement:

```
AutoFoundryWeight[Plywood, Brick, Mythril] = 0.5
```

```json
{
    "foundry_w_Plywood": 0.5,
    "foundry_w_Brick": 0.5,
    "foundry_w_Mythril": 0.5
}
```

If you want to set a value to *all* suffixes, you can use the wildcard:

```
AutoFoundryWeight[*] = 0.5
```

```json
{
    "foundry_w_Plywood": 0.5,
    "foundry_w_Brick": 0.5,
    "foundry_w_Wrought_Iron": 0.5,
    "foundry_w_Sheet_Metal": 0.5,
    "foundry_w_Mythril": 0.5,
    "foundry_w_Aerogel": 0.5,
    "foundry_w_Nanoweave": 0.5,
    "foundry_w_Scarletite": 0.5,
    "foundry_w_Quantium": 0.5
}
```

And since only the last assignment counts for a given setting, you can override the values for some settings later:

```
AutoFoundryWeight[*] = 0.5
AutoFoundryWeight[Scarletite, Quantium] = 1
```

```json
{
    "foundry_w_Plywood": 0.5,
    "foundry_w_Brick": 0.5,
    "foundry_w_Wrought_Iron": 0.5,
    "foundry_w_Sheet_Metal": 0.5,
    "foundry_w_Mythril": 0.5,
    "foundry_w_Aerogel": 0.5,
    "foundry_w_Nanoweave": 0.5,
    "foundry_w_Scarletite": 1,
    "foundry_w_Quantium": 1
}
```

## Comments

Anything in a line after a `#` is treated as a comment and ignored by the compiler:

```
AutoFoundryWeight.Plywood = 0.5 ### A comment # still a comment
# There are no
# multi-line comments
# AutoFoundryWeight.Brick = 0.5
```

```json
{
    "foundry_w_Plywood": 0.5
}
```

## Conditions

You can add a condition after the assignment using the `if` keyword to create an override instead:

```
govGovernor = "entrepreneur" if ResetType.mad
```

```json
{
    "overrides": {
        "govGovernor": [
            {
                "type1": "ResetType",
                "arg1": "mad",
                "cmp": "==",
                "type2": "Boolean",
                "arg2": true,
                "ret": "entrepreneur"
            }
        ]
    }
}
```

And you can compose whatever logic you want using logical and arithmetic operators:

```
AutoBuild.galaxy-starbase = OFF if ResourceQuantity.Gateway_Support + 1 < ResourceStorage.Gateway_Support
```

```json
{
    "overrides": {
        "batgalaxy-starbase": [
            {
                "type1": "Eval",
                "arg1": "_('ResourceQuantity', 'Gateway_Support') + 1",
                "cmp": "<",
                "type2": "ResourceStorage",
                "arg2": "Gateway_Support",
                "ret": false
            }
        ]
    }
}
```

The precedence of operators, in descending order (and of course you can use parentheses):
1) `not`
2) `*`, `/`
3) `+`, `-`
4) `<`, `<=`, `>`, `>=`
5) `==`, `!=`
6) `and`
7) `or`

## Built-in Expressions

Check [expressions.ts](/src/lib/core/domain/expressions.ts) for the list of built-in expressions. Note that the `Other` expressions are used without any prefixes:

```
AutoBuild.space-satellite = ON if SatelliteCost < 10
```

```json
{
    "overrides": {
        "batspace-satellite": [
            {
                "type1": "Other",
                "arg1": "satcost",
                "cmp": "<",
                "type2": "Number",
                "arg2": 10,
                "ret": true
            }
        ]
    }
}
```

## Fold expressions

The syntax is the same as for setting prefixes except instead of a list it accepts a fold expression:

```
AutoFoundryWeight.Mythril = 0 if ResourceDemanded[Aluminium, Iridium or Alloy]
```

```json
{
    "overrides": {
        "foundry_w_Mythril": [
            {
                "type1": "Eval",
                "arg1": "_('ResourceDemanded', 'Aluminium') || _('ResourceDemanded', 'Iridium')",
                "cmp": "OR",
                "type2": "ResourceDemanded",
                "arg2": "Alloy",
                "ret": 0
            }
        ]
    }
}
```

Which also works with the `and` keyword. Alternatively, you can use `any of` or `all of` with a list:

```
AutoFoundryWeight.Mythril = 0 if ResourceDemanded[any of [Aluminium, Iridium, Alloy]]
```

It works by unwrapping the fold expression to the nearest boolean expression. So:

```
AutoFoundryWeight.Mythril = 0 if ResourceDemanded[Aluminium, Iridium or Alloy] < 100

AutoFoundryWeight.Brick = 0 if ResourceQuantity[Aluminium, Iridium or Alloy] < 100
```

Becomes:

```
AutoFoundryWeight.Mythril = 0 if any of [ResourceDemanded.Aluminium, ResourceDemanded.Iridium, ResourceDemanded.Alloy] < 100

AutoFoundryWeight.Brick = 0 if any of [ResourceQuantity.Aluminium < 100, ResourceQuantity.Iridium < 100, ResourceQuantity.Alloy < 100]
```

Here `ResourceDemanded` is a boolean expression (returns `true` or `false`) and so the fold expression unwraps immediately.
The `ResourceQuantity` returns a number, so the fold expression looks outwards until it finds a boolean expression (`<`) and unwraps there.

## Placeholders

When using a prefix+suffix as an assignment target, you can refer to the suffix in the condition using `...`:

```
AutoFactoryWeight.Alloy = 10 if ResourceRatio[...] < 0.1
```

```json
{
    "overrides": {
        "production_w_Alloy": [
            {
                "type1": "ResourceRatio",
                "arg1": "Alloy",
                "cmp": "<",
                "type2": "Number",
                "arg2": 0.1,
                "ret": 10
            }
        ]
    }
}
```

Which is even more powerful when combined with the wildcard:

```
AutoFactoryWeight[*] = 10 if ResourceRatio[...] < 0.1
```

```json
{
    "overrides": {
        "production_w_Money": [
            {
                "type1": "ResourceRatio",
                "arg1": "Money",
                "cmp": "<",
                "type2": "Number",
                "arg2": 0.1,
                "ret": 10
            }
        ],
        "production_w_Furs": [
            {
                "type1": "ResourceRatio",
                "arg1": "Furs",
                "cmp": "<",
                "type2": "Number",
                "arg2": 0.1,
                "ret": 10
            }
        ],
        "production_w_Alloy": [
            {
                "type1": "ResourceRatio",
                "arg1": "Alloy",
                "cmp": "<",
                "type2": "Number",
                "arg2": 0.1,
                "ret": 10
            }
        ],
        ...
    }
}
```

## Expressions as values

You can assign an expression directly to a setting:

```
AutoCraft.Plywood = ResourceQuantity[...] < ResourceMaxCost[...]
```

```json
{
    "overrides": {
        "craftPlywood": [
            {
                "type1": "Boolean",
                "arg1": true,
                "cmp": "A?B",
                "type2": "Eval",
                "arg2": "_('ResourceQuantity', 'Plywood') < _('ResourceMaxCost', 'Plywood')",
                "ret": null
            }
        ]
    }
}
```

## Eval literal

In case the built-in expressions are not enough, you can embed a JS code inside a `{}` literal:

```
BuildingMax.portal-carport = 5 if {game.global.portal.fortress.threat} > 1000
```

```json
{
    "overrides": {
        "bld_m_portal-carport": [
            {
                "type1": "Eval",
                "arg1": "game.global.portal.fortress.threat",
                "cmp": ">",
                "type2": "Number",
                "arg2": 1000,
                "ret": 5
            }
        ]
    }
}
```

If you need to use `{` or `}` inside your eval, you can use the `{{}}` literal instead:

```
BuildingMax.portal-carport = 5 if {{game.global.portal.fortress.threat}} > 1000
```

There's no `{{{}}}`, so if you need to use `{{` or `}}` inside your eval, put a space between the braces.

## Condition blocks

Alternatively, you can use an `if` block to create overrides (which can contain multiple statements):

```
if ResetType.mad then
    govGovernor = "entrepreneur"
    AutoBuild.city-boot_camp = OFF
end
```

```json
{
    "overrides": {
        "govGovernor": [
            {
                "type1": "ResetType",
                "arg1": "mad",
                "cmp": "==",
                "type2": "Boolean",
                "arg2": true,
                "ret": "entrepreneur"
            }
        ],
        "batcity-boot_camp": [
            {
                "type1": "ResetType",
                "arg1": "mad",
                "cmp": "==",
                "type2": "Boolean",
                "arg2": true,
                "ret": false
            }
        ]
    }
}
```

Nested blocks (and inline conditions) combine their conditions using the `and` operator:

```
if ResetType.ascension then
    if not RacePillared.Current then
        govSpace = "socialist" if ResearchComplete.tech-pillars
    end
end
```

```json
{
    "overrides": {
        "govSpace": [
            {
                "type1": "Eval",
                "arg1": "_('ResetType', 'ascension') && !_('RacePillared', 'species')",
                "cmp": "AND",
                "type2": "ResearchComplete",
                "arg2": "tech-pillars",
                "ret": "socialist"
            }
        ]
    }
}
```

Be careful with the order of statements, however: because of how overrides work, the later overrides may never be picked if a previous one is true:

```
if ResetType.ascension then
    govSpace = "theocracy"

    if not RacePillared.Current then
        # This condition is a superset of the one above, meaning it is true only when the previous one is true
        # Which means the previous override is always picked by the script, even if this condition is true
        govSpace = "socialist"
    end
end
```

```json
{
    "overrides": {
        "govSpace": [
            {
                "type1": "ResetType",
                "arg1": "ascension",
                "cmp": "==",
                "type2": "Boolean",
                "arg2": true,
                "ret": "theocracy"
            },
            {
                "type1": "Eval",
                "arg1": "_('ResetType', 'ascension') && !_('RacePillared', 'species')",
                "cmp": "==",
                "type2": "Boolean",
                "arg2": true,
                "ret": "socialist"
            }
        ]
    }
}
```

## Log filter

There are a couple of special settings that have slightly different syntax - `logFilter` is one of them. It is treated as a list of strings and instead of assigning to it, you push (append) values to it:

```
# Either a single value
logFilter << "civics_garrison_victorious"

# Or multiple
logFilter << [
    "interstellar_blackhole_unstable",
    "research_success%tech_stabilize_blackhole"
]
```

```json
{
    "logFilter": "civics_garrison_victorious, interstellar_blackhole_unstable, research_success%tech_stabilize_blackhole"
}
```

You cannot pop (remove) from the list or use conditions.

## Ignored research

Similar to `logFilter` you can push techs into the list (except instead of strings (quoted), you use plain identifiers):

```
researchIgnore << [
    tech-combat_droids,
    tech-hellfire_furnace,
    tech-cyborg_soldiers
]
```

```json
{
    "researchIgnore": [
        "tech-combat_droids",
        "tech-hellfire_furnace",
        "tech-cyborg_soldiers"
    ]
}
```

You can also pop from the list:

```
researchIgnore << [
    tech-combat_droids,
    tech-hellfire_furnace,
    tech-cyborg_soldiers
]

researchIgnore >> tech-hellfire_furnace
```

```json
{
    "researchIgnore": [
        "tech-combat_droids",
        "tech-cyborg_soldiers"
    ]
}
```

Which isn't too useful on its own, but you can do both operations conditionally:

```
researchIgnore << [
    tech-combat_droids,
    tech-hellfire_furnace,
    tech-cyborg_soldiers
]

researchIgnore >> tech-combat_droids if ResearchComplete.tech-xeno_linguistics

researchIgnore << tech-bolognium_alloy_beams if not ResearchComplete.tech-hydroponics
```

```json
{
    "overrides": {
        "researchIgnore": [
            {
                "type1": "ResearchComplete",
                "arg1": "tech-hydroponics",
                "cmp": "==",
                "type2": "Boolean",
                "arg2": false,
                "ret": "tech-bolognium_alloy_beams"
            },
            {
                "type1": "ResearchComplete",
                "arg1": "tech-xeno_linguistics",
                "cmp": "==",
                "type2": "Boolean",
                "arg2": true,
                "ret": "tech-combat_droids"
            }
        ]
    },
    "researchIgnore": [
        "tech-combat_droids",
        "tech-hellfire_furnace",
        "tech-cyborg_soldiers"
    ]
}
```

## Evolution queue

The `evolutionQueue` setting is also treated as a list. However, it expects a set of settings in each item. You can put any setting there as long as both `userEvolutionTarget` and `prestigeType` are present:

```
evolutionQueue << begin
    userEvolutionTarget = "cyclops"
    prestigeType = "mad"
end

evolutionQueue << begin
    userEvolutionTarget = "custom"
    prestigeType = "mad"
end

evolutionQueue << begin
    userEvolutionTarget = "arraak"
    prestigeType = "ascension"

    Challenge[*] = OFF
    Challenge.trade = ON
end
```

```json
{
    "evolutionQueue": [
        {
            "userEvolutionTarget": "cyclops",
            "prestigeType": "mad"
        },
        {
            "userEvolutionTarget": "custom",
            "prestigeType": "mad"
        },
        {
            "userEvolutionTarget": "arraak",
            "prestigeType": "ascension",
            "challenge_plasmid": false,
            "challenge_crispr": false,
            "challenge_trade": true,
            "challenge_craft": false,
            "challenge_joyless": false,
            "challenge_steelen": false,
            "challenge_decay": false,
            "challenge_emfield": false,
            "challenge_inflation": false,
            "challenge_sludge": false,
            "challenge_orbit_decay": false,
            "challenge_gravity_well": false,
            "challenge_witch_hunter": false,
            "challenge_junker": false,
            "challenge_cataclysm": false,
            "challenge_banana": false,
            "challenge_truepath": false,
            "challenge_lone_survivor": false
        }
    ]
}
```

You can't pop from it or use conditions.

## Triggers

You can add triggers using the following syntax: `Action id (count) when Requirement id (count)`. The `count` is optional and is defaulted to `1`.

```
Research tech-arpa when Unlocked tech-arpa

Build space-iridium_mine when Built space-moon_base

Build galaxy-dreadnought when Built galaxy-dreadnought (0)

Build portal-vault (2) when Built portal-vault (0)
```

```json
{
    "triggers": [
        {
            "seq": 0,
            "priority": 0,
            "requirementType": "unlocked",
            "requirementId": "tech-arpa",
            "requirementCount": 1,
            "actionType": "research",
            "actionId": "tech-arpa",
            "actionCount": 1,
            "complete": false
        },
        {
            "seq": 1,
            "priority": 1,
            "requirementType": "built",
            "requirementId": "space-moon_base",
            "requirementCount": 1,
            "actionType": "build",
            "actionId": "space-iridium_mine",
            "actionCount": 1,
            "complete": false
        },
        {
            "seq": 2,
            "priority": 2,
            "requirementType": "built",
            "requirementId": "galaxy-dreadnought",
            "requirementCount": 0,
            "actionType": "build",
            "actionId": "galaxy-dreadnought",
            "actionCount": 1,
            "complete": false
        },
        {
            "seq": 3,
            "priority": 3,
            "requirementType": "built",
            "requirementId": "portal-vault",
            "requirementCount": 0,
            "actionType": "build",
            "actionId": "portal-vault",
            "actionCount": 2,
            "complete": false
        }
    ]
}
```

## Trigger chains

To create a trigger chain use a trigger block:

```
when Unlocked tech-industrialization do
    Research tech-industrialization
    Research tech-diplomacy
    Research tech-republic
    Research tech-technocracy
end
```

```json
{
    "triggers": [
        {
            "seq": 0,
            "priority": 0,
            "requirementType": "unlocked",
            "requirementId": "tech-industrialization",
            "requirementCount": 1,
            "actionType": "research",
            "actionId": "tech-industrialization",
            "actionCount": 1,
            "complete": false
        },
        {
            "seq": 1,
            "priority": 1,
            "requirementType": "chain",
            "requirementId": "",
            "requirementCount": 0,
            "actionType": "research",
            "actionId": "tech-diplomacy",
            "actionCount": 1,
            "complete": false
        },
        {
            "seq": 2,
            "priority": 2,
            "requirementType": "chain",
            "requirementId": "",
            "requirementCount": 0,
            "actionType": "research",
            "actionId": "tech-republic",
            "actionCount": 1,
            "complete": false
        },
        {
            "seq": 3,
            "priority": 3,
            "requirementType": "chain",
            "requirementId": "",
            "requirementCount": 0,
            "actionType": "research",
            "actionId": "tech-technocracy",
            "actionCount": 1,
            "complete": false
        }
    ]
}
```

## Conditional triggers

Triggers and trigger blocks can be added inside an `if` block to enable a the triggers only when condition is true:

```
if ResetType.mad then
    Research tech-mad when Unlocked tech-mad
end
```

```json
{
    "overrides": {
        "masterScriptToggle": [
            {
                "type1": "Eval",
                "arg1": "TriggerManager.priorityList[0].complete = !(_('ResetType', 'mad'))",
                "cmp": "AND",
                "type2": "Boolean",
                "arg2": false,
                "ret": true
            }
        ]
    },
    "triggers": [
        {
            "seq": 0,
            "priority": 0,
            "requirementType": "unlocked",
            "requirementId": "tech-mad",
            "requirementCount": 1,
            "actionType": "research",
            "actionId": "tech-mad",
            "actionCount": 1,
            "complete": false
        }
    ]
}
```

The caveat is that you can't move such triggers in UI - it toggles the triggers at the specific positions and if you put another trigger at that position, it'll toggle that instead. But as long as you're using the DSL exclusively, it shouldn't be a problem.

## Variables

You can define values and expressions and refer to them using the `$` symbol:

```
# Rush turrets
def vault_started = BuildingUnlocked.portal-vault

def hell_threat_level = {game.global.portal.fortress.threat}

BuildingMax.portal-carport = 5 if $hell_threat_level > 1000

if $vault_started then
    AutoBuild.interstellar-orichalcum_sphere = OFF

    def vault_cost = 30000000
    def scarletite_cost = 8000000
    def orichalcum_required = $vault_cost + $scarletite_cost

    AutoBuild.interstellar-ascension_machine = ResourceQuantity.Orichalcum > $orichalcum_required
end
```

```json
{
    "overrides": {
        "bld_m_portal-carport": [
            {
                "type1": "Eval",
                "arg1": "game.global.portal.fortress.threat",
                "cmp": ">",
                "type2": "Number",
                "arg2": 1000,
                "ret": 5
            }
        ],
        "batinterstellar-orichalcum_sphere": [
            {
                "type1": "BuildingUnlocked",
                "arg1": "portal-vault",
                "cmp": "==",
                "type2": "Boolean",
                "arg2": true,
                "ret": false
            }
        ],
        "batinterstellar-ascension_machine": [
            {
                "type1": "BuildingUnlocked",
                "arg1": "portal-vault",
                "cmp": "A?B",
                "type2": "Eval",
                "arg2": "_('ResourceQuantity', 'Orichalcum') > (30000000 + 8000000)",
                "ret": null
            }
        ]
    }
}
```

## Custom expressions

Expression definitions can be parametrized with a suffix:

```
def MissionUnaffordable[...] = BuildingUnlocked[...] and not BuildingAffordable[...]

def DEUTERIUM_MISSIONS = [
    interstellar-wormhole_mission,
    galaxy-gateway_mission,
    portal-pit_mission
]

if $MissionUnaffordable[any of $DEUTERIUM_MISSIONS] then
    AutoBuildWeight.interstellar-xfer_station = 10000 if ResourceSatisfied.Alpha_Support
end
```

```json
{
    "overrides": {
        "bld_w_interstellar-xfer_station": [
            {
                "type1": "Eval",
                "arg1": "((_('BuildingUnlocked', 'interstellar-wormhole_mission') && !_('BuildingAffordable', 'interstellar-wormhole_mission')) || (_('BuildingUnlocked', 'galaxy-gateway_mission') && !_('BuildingAffordable', 'galaxy-gateway_mission'))) || (_('BuildingUnlocked', 'portal-pit_mission') && !_('BuildingAffordable', 'portal-pit_mission'))",
                "cmp": "AND",
                "type2": "ResourceSatisfied",
                "arg2": "Alpha_Support",
                "ret": 10000
            }
        ]
    }
}
```

## Functions

You can also define functions (statement lists) that can be parameterized:

```
def enqueue(targetRace, targetPrestige, challenges) begin
    evolutionQueue << begin
        userEvolutionTarget = $targetRace
        prestigeType = $targetPrestige

        Challenge[*] = OFF
        Challenge[$challenges] = ON
    end
end

$enqueue("cyclops", "mad", [])
$enqueue("custom", "mad", [])
$enqueue("synth", "ascension", [trade])
```

```json
{
    "evolutionQueue": [
        {
            "userEvolutionTarget": "cyclops",
            "prestigeType": "mad",
            "challenge_trade": false,
            ...
        },
        {
            "userEvolutionTarget": "custom",
            "prestigeType": "mad",
            "challenge_trade": false,
            ...
        },
        {
            "userEvolutionTarget": "synth",
            "prestigeType": "ascension",
            "challenge_trade": true,
            ...
        }
    ]
}
```

Besides other funcitons, you can pass anything as an argument.

## Loops

You can generate settings for each element of a list:

```
def PRIORITY_RESEARCH = [
    tech-arpa,
    tech-rover,
    tech-probes,
    tech-starcharts,
    tech-quantum_computing,
    tech-metaphysics
]

for tech in $PRIORITY_RESEARCH do
    Research $tech when Unlocked $tech
end

```

```json
{
    "triggers": [
        {
            "seq": 0,
            "priority": 0,
            "requirementType": "unlocked",
            "requirementId": "tech-arpa",
            "requirementCount": 1,
            "actionType": "research",
            "actionId": "tech-arpa",
            "actionCount": 1,
            "complete": false
        },
        {
            "seq": 1,
            "priority": 1,
            "requirementType": "unlocked",
            "requirementId": "tech-rover",
            "requirementCount": 1,
            "actionType": "research",
            "actionId": "tech-rover",
            "actionCount": 1,
            "complete": false
        },
        {
            "seq": 2,
            "priority": 2,
            "requirementType": "unlocked",
            "requirementId": "tech-probes",
            "requirementCount": 1,
            "actionType": "research",
            "actionId": "tech-probes",
            "actionCount": 1,
            "complete": false
        },
        ...
    ]
}
```

## Import

You can import statements from other files with the `use` keyword:

```
# contents of the 'common' file

def prioritizeResearch(tech) begin
    Research $tech when Unlocked $tech
end
```

```
# contents of the 'mad' file

use "common"

govGovernor = "entrepreneur"
$prioritizeResearch(tech-mad)
```

```
# contents of the 'ascension' file

if not RacePillared.Current then
    use "ascension/pillars"
end

govSpace = "theocracy"
govGovernor = "sports"
```

```
# contents of the 'ascension/pillars' file

govSpace = "socialist" if ResearchComplete.tech-pillars
```

```
# contents of the 'main' file

if ResetType.ascension then
    use "ascension"
end

if ResetType.mad then
    use "mad"
end
```

```json
{
    "overrides": {
        "govSpace": [
            {
                "type1": "Eval",
                "arg1": "_('ResetType', 'ascension') && !_('RacePillared', 'species')",
                "cmp": "AND",
                "type2": "ResearchComplete",
                "arg2": "tech-pillars",
                "ret": "socialist"
            },
            {
                "type1": "ResetType",
                "arg1": "ascension",
                "cmp": "==",
                "type2": "Boolean",
                "arg2": true,
                "ret": "theocracy"
            }
        ],
        "govGovernor": [
            {
                "type1": "ResetType",
                "arg1": "ascension",
                "cmp": "==",
                "type2": "Boolean",
                "arg2": true,
                "ret": "sports"
            },
            {
                "type1": "ResetType",
                "arg1": "mad",
                "cmp": "==",
                "type2": "Boolean",
                "arg2": true,
                "ret": "entrepreneur"
            }
        ],
        "masterScriptToggle": [
            {
                "type1": "Eval",
                "arg1": "TriggerManager.priorityList[0].complete = !(_('ResetType', 'mad'))",
                "cmp": "AND",
                "type2": "Boolean",
                "arg2": false,
                "ret": true
            }
        ]
    },
    "triggers": [
        {
            "seq": 0,
            "priority": 0,
            "requirementType": "unlocked",
            "requirementId": "tech-mad",
            "requirementCount": 1,
            "actionType": "research",
            "actionId": "tech-mad",
            "actionCount": 1,
            "complete": false
        }
    ]
}
```
