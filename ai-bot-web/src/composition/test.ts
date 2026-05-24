export const test = async () => {
  const res = await fetch("/api/test");
  const readableStream = res.body;
  if (!readableStream) return;
  const decoder = new TextDecoder("UTF-8");
  const reader = readableStream.getReader();
  while (true) {
    const { value, done } = await reader.read();
    const lines = decoder.decode(value, { stream: true });
    lines.split("\n").forEach((line) => {
      const trimedLine = line.trim();
      if (!trimedLine) return;
      console.log(JSON.parse(trimedLine));
    });
    if (done) return;
  }
};
