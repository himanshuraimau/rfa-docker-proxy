import http from 'http';
import express from 'express';
import dockerode from 'dockerode';
import httpProxy from 'http-proxy';

const docker = new dockerode({
  socket: "/var/run/docker.sock"
});
const proxy = httpProxy.createProxyServer();

const db = new Map();

docker.getEvents(function(err, stream) {
  if (err) return console.error(err);

  stream.on('data', async (chunk) => {
    if (!chunk) return;
    const event = JSON.parse(chunk.toString());

    if (event.Type === "container" && event.Action === "start") {
      const container = docker.getContainer(event.id);
      const containerInfo = await container.inspect();
      const containerName = containerInfo.Name.substring(1);
      const containerIP = containerInfo.NetworkSettings.IPAddress;
      const exposedPorts = Object.keys(containerInfo.Config.ExposedPorts);

      let defaultPort = null; 

      if (exposedPorts.length > 0) {
        const [port, type] = exposedPorts[0].split("/");
        if (type === "tcp") {
          defaultPort = port;
          console.log(`Container ${containerInfo.Name} is running on http://${containerIP}:${port}`);
        }
      }

      console.log(`Registering container ${containerName}.localhost ---> http://${containerIP}:${defaultPort}`);
      db.set(containerName, {
        containerName,
        containerIP,
        defaultPort
      });
    }
  });
});

const reverseProxyApp = express();

reverseProxyApp.use((req, res, next) => {
  const hostname = req.hostname;
  const subdomain = hostname.split('.')[0];

  if (!db.has(subdomain)) {
    return res.status(404).send('Not Found');
  }

  const { containerIP, defaultPort } = db.get(subdomain);
  const target = `http://${containerIP}:${defaultPort}`;
  console.log(`Forwarding ${hostname} to ${proxy}`);

  return proxy.web(req, res, { target, changeOrigin: true });
});

const reverseProxy = http.createServer(reverseProxyApp);

const managementAPI = express();

managementAPI.use(express.json());

managementAPI.get('/containers', async (req, res) => {
  const { image, tags = "latest" } = req.body;

  let imageAlreadyExists = false;

  const images = await docker.listImages({ all: true });

  for (const systemImage of images) {
    for (const systemTag of systemImage.Repotags) {
      if (systemTag === `${image}:${tags}`) {
        imageAlreadyExists = true;
        break;
      }
    }

    if (imageAlreadyExists) {
      break;
    }
  }

  if (!imageAlreadyExists) {
    console.log(`Pulling image ${image}:${tags}`);
    await docker.pull(`${image}:${tags}`);
    console.log(`Image ${image}:${tags} pulled successfully`);
  }

  const container = await docker.createContainer({
    Image: `${image}:${tags}`,
    Tty: false,
    HostConfig: {
      AutoRemove: true,
    }
  });

  await container.start();

  return res.json({
    status: "success",
    container: `${(await container.inspect()).Name}.localhost`,
  });
});

managementAPI.listen(8080, () => {
  console.log('Management API listening on port 8080');
});

reverseProxy.listen(80, () => {
  console.log('Reverse proxy listening on port 80');
});
