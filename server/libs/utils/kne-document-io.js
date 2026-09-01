const readZipUploadBuffer = async request => {
  const data = await request.file();
  if (!data) {
    throw new Error('请上传 zip 文件');
  }
  const chunks = [];
  for await (const chunk of data.file) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

const sendZipDownload = (reply, { buffer, filename }) => {
  reply.header('Content-Type', 'application/zip').header('Content-Disposition', `attachment; filename="${filename}"`).send(buffer);
};

module.exports = {
  readZipUploadBuffer,
  sendZipDownload
};
