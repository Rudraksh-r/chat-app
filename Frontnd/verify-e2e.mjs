import { io } from 'socket.io-client';

const API_URL = 'http://localhost:5001/api';

async function runTest() {
  console.log('Starting E2E verification...');

  // 1. Register User 1
  const u1 = { fullName: "Test User 1", username: "tu1_" + Date.now(), email: "tu1_" + Date.now() + "@test.com", password: "password123" };
  const r1 = await fetch(`${API_URL}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(u1)
  });
  if (!r1.ok) throw new Error("Failed to register User 1: " + await r1.text());
  const res1 = await r1.json();
  const token1 = res1.data.accessToken;
  const userId1 = res1.data.createdUser._id;
  console.log('User 1 registered:', userId1);

  // 2. Register User 2
  const u2 = { fullName: "Test User 2", username: "tu2_" + Date.now(), email: "tu2_" + Date.now() + "@test.com", password: "password123" };
  const r2 = await fetch(`${API_URL}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(u2)
  });
  if (!r2.ok) throw new Error("Failed to register User 2: " + await r2.text());
  const res2 = await r2.json();
  const token2 = res2.data.accessToken;
  const userId2 = res2.data.createdUser._id;
  console.log('User 2 registered:', userId2);

  // 3. Connect Socket for User 1
  const socket = io('http://localhost:5001', {
    auth: { token: token1 }
  });
  
  await new Promise((resolve, reject) => {
    socket.on('connect', () => resolve());
    socket.on('connect_error', (err) => reject(err));
    setTimeout(() => reject(new Error('Socket timeout')), 5000);
  });
  console.log('Socket connected successfully for User 1.');

  // 4. Create Group Chat
  const groupReq = await fetch(`${API_URL}/conversation/group`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token1}` },
    body: JSON.stringify({ name: "E2E Test Group", memberIds: [userId2] })
  });
  if (!groupReq.ok) throw new Error("Failed to create group chat: " + await groupReq.text());
  const groupRes = await groupReq.json();
  const convoId = groupRes.data._id;
  console.log('Group chat created:', convoId);

  // 5. Send Message with File Upload
  const formData = new FormData();
  formData.append('convoId', convoId);
  formData.append('type', 'text');
  formData.append('ciphertext', 'dGVzdA=='); // base64 for 'test'
  formData.append('counter', '1');
  formData.append('iv', 'dGVzdA==');
  
  const blob = new Blob(['Hello World!'], { type: 'text/plain' });
  formData.append('file', blob, 'test.txt');

  const msgReq = await fetch(`${API_URL}/message/send`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token1}` },
    body: formData
  });
  if (!msgReq.ok) throw new Error("Failed to send message: " + await msgReq.text());
  console.log('Message sent with file successfully.');

  socket.disconnect();
  console.log('All automated tests passed successfully!');
}

runTest().catch(err => {
  console.error("Test Failed:", err);
  process.exit(1);
});
