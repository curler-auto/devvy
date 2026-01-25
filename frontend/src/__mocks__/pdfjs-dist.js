module.exports = {
  GlobalWorkerOptions: {},
  getDocument: jest.fn(() => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: jest.fn(() => Promise.resolve({
        getViewport: () => ({ width: 100, height: 100 }),
        render: () => ({ promise: Promise.resolve() }),
        getTextContent: () => Promise.resolve({ items: [] })
      }))
    })
  })),
};
