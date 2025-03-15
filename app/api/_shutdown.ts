import { closeConnections } from '@/lib/db';

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM signal, closing connections...');
  await closeConnections();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT signal, closing connections...');
  await closeConnections();
  process.exit(0);
}); 