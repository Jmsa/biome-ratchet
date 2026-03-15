// intentional lint violations for biome-ratchet integration tests
const x = 1;
const y = 2;

// biome-ratchet-violation-count: 2x noDoubleEquals
if (x == y) {
  console.log("equal");
}

if (x == 0) {
  console.log("zero");
}
