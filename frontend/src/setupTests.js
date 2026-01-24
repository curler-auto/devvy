// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
// import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

if (!Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function() {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result);
      };
      reader.readAsArrayBuffer(this);
    });
  };
}

// Mock Canvas
HTMLCanvasElement.prototype.getContext = () => {
  return {
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn((x, y, w, h) => ({
      data: new Array(w * h * 4).fill(0)
    })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => []),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    fillText: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
  };
};

HTMLCanvasElement.prototype.toBlob = (callback) => {
    callback(new Blob(['image'], { type: 'image/jpeg' }));
};
