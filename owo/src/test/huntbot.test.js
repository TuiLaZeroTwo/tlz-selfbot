const content = `
**<:cbot:459996048379609098> |** \`BEEP BOOP. I AM BACK WITH 275 ANIMALS,\`
**<:blank:427371936482328596> |** \`3569 ESSENCE, AND 1428 EXPERIENCE\` 
<:common:416520037713838081> **|** :butterfly:²⁸   :bee:²⁷   :snail:³⁶   :bug:²⁶   :beetle:²⁷   
<:uncommon:416520056269176842> **|** :chipmunk:¹⁶   :rooster:²¹   :mouse2:¹⁵   :rabbit2:²²   :baby_chick:¹⁹   
<:rare:416520066629107712> **|** :cat2:¹¹   :pig2:⁰⁷   :cow2:⁰⁴   :dog2:⁰³   :sheep:⁰⁸   
<:epic:416520722987614208> **|** :whale:⁰²   :tiger2:⁰¹   :penguin:⁰¹   :crocodile:⁰¹`;
// console.log(content.match(/:(\w+):([\u2070\u00B9\u00B2\u00B3\u2074-\u2079]+)/g))
console.log(/:(\w+):([\u2070\u00B9\u00B2\u00B3\u2074-\u2079]+)/g.exec(content));
export {};
