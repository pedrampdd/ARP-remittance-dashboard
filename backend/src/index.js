const express = require('express');
const cors = require('cors');

const corridorsRouter = require('./routes/corridors');
const { fetchAllData } = require('./services/pipeline');

const PORT = process.env.PORT || 3001;

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api/corridors', corridorsRouter);

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  try {
    const data = await fetchAllData();
    corridorsRouter.setCachedData(data);
    console.log('\n✓ Data loaded successfully');
  } catch (error) {
    console.error('Failed to load initial data:', error.message);
    console.error('Server will start but /api/corridors will return 503 until data is available');
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 ARP GPS Dashboard backend running on http://localhost:${PORT}`);
    console.log(`   API: http://localhost:${PORT}/api/corridors`);
  });
}

startServer().catch(console.error);
