const sampleName = /^(?<name>[a-z]+)-(\d{3})\.csv$/i;
const match = sampleName.exec("signal-001.csv");

if (match) {
  console.log(match.groups.name, match[2]);
}
