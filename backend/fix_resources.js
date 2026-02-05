// fix_resources.js
// MongoDB migration script to standardize resources collection for dispatch matching.

const collection = db.getCollection("resources");

// Master Catalog mapping: item_name -> category
const masterCatalog = {
    "Rescue Team": "Rescue",
    "Medical Kit": "Medical",
    "Ambulance": "Medical",
    "ICU Ambulance": "Medical",
    "Fire Truck": "Fire",
    "Firefighter Suit": "Fire",
    "Rescue Boat": "Rescue",
    "Life Jackets & Ropes": "Rescue",
    "Food Packets": "Relief",
    "Water Tanker": "Relief",
    "Generator": "Equipment",
    "Police Patrol": "Police",
};

// Name mapping rules: exact or regex-based matches to master item_name
const nameMappings = [
    { match: "Standard Ambulance", to: "Ambulance" },
    { match: "ICU Ambulance Unit - Beta", to: "ICU Ambulance" },
    { match: "Water Bottles", to: "Food Packets" },
    { match: "Water Bottles (Pack)", to: "Food Packets" },
    { match: "Rope Ladder", to: "Life Jackets & Ropes" },
    { match: "Rescue Rope", to: "Life Jackets & Ropes" },
    { match: "Diesel Generator", to: "Generator" },
    { match: "Backup Generator", to: "Generator" },
    { match: "Fire Engine", to: "Fire Truck" },
    { match: "Fire Suit", to: "Firefighter Suit" },
    { match: "Police Unit", to: "Police Patrol" },
    { match: "Patrol Car", to: "Police Patrol" },
    // Regex examples for noisy names
    { matchRegex: /icu\s*ambulance/i, to: "ICU Ambulance" },
    { matchRegex: /ambulance/i, to: "Ambulance" },
    { matchRegex: /fire\s*truck|fire\s*engine/i, to: "Fire Truck" },
    { matchRegex: /fire\s*suit|firefighter\s*suit/i, to: "Firefighter Suit" },
    { matchRegex: /rescue\s*boat/i, to: "Rescue Boat" },
    { matchRegex: /life\s*jackets?|ropes?|rope\s*ladder/i, to: "Life Jackets & Ropes" },
    { matchRegex: /food\s*packets?|meal\s*pack/i, to: "Food Packets" },
    { matchRegex: /water\s*tanker/i, to: "Water Tanker" },
    { matchRegex: /generator/i, to: "Generator" },
    { matchRegex: /police\s*patrol|patrol\s*car|police\s*unit/i, to: "Police Patrol" },
];

let totalMatched = 0;
let totalModified = 0;

// 1) Rename items to master names
nameMappings.forEach((rule) => {
    let filter = {};
    if (rule.match) {
        filter = { item_name: rule.match };
    } else if (rule.matchRegex) {
        filter = { item_name: { $regex: rule.matchRegex } };
    }

    const result = collection.updateMany(
        filter,
        { $set: { item_name: rule.to } }
    );

    totalMatched += result.matchedCount || 0;
    totalModified += result.modifiedCount || 0;
});

// 2) Enforce correct category for all master items
Object.keys(masterCatalog).forEach((name) => {
    const result = collection.updateMany(
        { item_name: name },
        { $set: { category: masterCatalog[name] } }
    );

    totalMatched += result.matchedCount || 0;
    totalModified += result.modifiedCount || 0;
});

print("Resource standardization complete.");
print(`Matched: ${totalMatched} documents`);
print(`Modified: ${totalModified} documents`);
