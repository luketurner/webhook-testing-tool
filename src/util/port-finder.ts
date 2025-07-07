import "@/server-only";
import net from "net";

export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

export async function findAvailablePorts(
  startPort: number,
  endPort: number,
  count: number,
): Promise<number[]> {
  const availablePorts: number[] = [];

  for (
    let port = startPort;
    port <= endPort && availablePorts.length < count;
    port++
  ) {
    if (await isPortAvailable(port)) {
      availablePorts.push(port);
    }
  }

  if (availablePorts.length < count) {
    throw new Error(
      `Could not find ${count} available ports in range ${startPort}-${endPort}`,
    );
  }

  return availablePorts;
}
