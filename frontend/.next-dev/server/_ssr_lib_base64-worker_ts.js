/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "(ssr)/./lib/base64-worker.ts":
/*!******************************!*\
  !*** ./lib/base64-worker.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n// Web Worker para convertir archivos a base64 sin bloquear main thread\nself.onmessage = async (e)=>{\n    const { file } = e.data;\n    try {\n        const arrayBuffer = await file.arrayBuffer();\n        const bytes = new Uint8Array(arrayBuffer);\n        // Procesar en chunks para evitar bloquear worker\n        const chunkSize = 8192;\n        let binary = \"\";\n        for(let i = 0; i < bytes.length; i += chunkSize){\n            const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));\n            binary += String.fromCharCode(...chunk);\n            // Reportar progreso cada 10%\n            if (i % (bytes.length / 10 | 0) === 0) {\n                self.postMessage({\n                    type: \"progress\",\n                    progress: i / bytes.length * 100\n                });\n            }\n        }\n        const base64 = btoa(binary);\n        self.postMessage({\n            type: \"success\",\n            base64\n        });\n    } catch (error) {\n        self.postMessage({\n            type: \"error\",\n            error: error.message\n        });\n    }\n};\n\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9saWIvYmFzZTY0LXdvcmtlci50cyIsIm1hcHBpbmdzIjoiO0FBQUEsdUVBQXVFO0FBQ3ZFQSxLQUFLQyxTQUFTLEdBQUcsT0FBT0M7SUFDdEIsTUFBTSxFQUFFQyxJQUFJLEVBQUUsR0FBR0QsRUFBRUUsSUFBSTtJQUV2QixJQUFJO1FBQ0YsTUFBTUMsY0FBYyxNQUFNRixLQUFLRSxXQUFXO1FBQzFDLE1BQU1DLFFBQVEsSUFBSUMsV0FBV0Y7UUFFN0IsaURBQWlEO1FBQ2pELE1BQU1HLFlBQVk7UUFDbEIsSUFBSUMsU0FBUztRQUViLElBQUssSUFBSUMsSUFBSSxHQUFHQSxJQUFJSixNQUFNSyxNQUFNLEVBQUVELEtBQUtGLFVBQVc7WUFDaEQsTUFBTUksUUFBUU4sTUFBTU8sUUFBUSxDQUFDSCxHQUFHSSxLQUFLQyxHQUFHLENBQUNMLElBQUlGLFdBQVdGLE1BQU1LLE1BQU07WUFDcEVGLFVBQVVPLE9BQU9DLFlBQVksSUFBSUw7WUFFakMsNkJBQTZCO1lBQzdCLElBQUlGLElBQUtKLENBQUFBLE1BQU1LLE1BQU0sR0FBRyxLQUFLLE9BQU8sR0FBRztnQkFDckNYLEtBQUtrQixXQUFXLENBQUM7b0JBQUVDLE1BQU07b0JBQVlDLFVBQVUsSUFBS2QsTUFBTUssTUFBTSxHQUFJO2dCQUFJO1lBQzFFO1FBQ0Y7UUFFQSxNQUFNVSxTQUFTQyxLQUFLYjtRQUNwQlQsS0FBS2tCLFdBQVcsQ0FBQztZQUFFQyxNQUFNO1lBQVdFO1FBQU87SUFDN0MsRUFBRSxPQUFPRSxPQUFPO1FBQ2R2QixLQUFLa0IsV0FBVyxDQUFDO1lBQUVDLE1BQU07WUFBU0ksT0FBTyxNQUFpQkMsT0FBTztRQUFDO0lBQ3BFO0FBQ0Y7QUFFVSIsInNvdXJjZXMiOlsid2VicGFjazovL3N0dWRlcmUtZnJvbnRlbmQvLi9saWIvYmFzZTY0LXdvcmtlci50cz84OWJjIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIFdlYiBXb3JrZXIgcGFyYSBjb252ZXJ0aXIgYXJjaGl2b3MgYSBiYXNlNjQgc2luIGJsb3F1ZWFyIG1haW4gdGhyZWFkXG5zZWxmLm9ubWVzc2FnZSA9IGFzeW5jIChlOiBNZXNzYWdlRXZlbnQpID0+IHtcbiAgY29uc3QgeyBmaWxlIH0gPSBlLmRhdGE7XG4gIFxuICB0cnkge1xuICAgIGNvbnN0IGFycmF5QnVmZmVyID0gYXdhaXQgZmlsZS5hcnJheUJ1ZmZlcigpO1xuICAgIGNvbnN0IGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXlCdWZmZXIpO1xuICAgIFxuICAgIC8vIFByb2Nlc2FyIGVuIGNodW5rcyBwYXJhIGV2aXRhciBibG9xdWVhciB3b3JrZXJcbiAgICBjb25zdCBjaHVua1NpemUgPSA4MTkyO1xuICAgIGxldCBiaW5hcnkgPSBcIlwiO1xuICAgIFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IGNodW5rU2l6ZSkge1xuICAgICAgY29uc3QgY2h1bmsgPSBieXRlcy5zdWJhcnJheShpLCBNYXRoLm1pbihpICsgY2h1bmtTaXplLCBieXRlcy5sZW5ndGgpKTtcbiAgICAgIGJpbmFyeSArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKC4uLmNodW5rKTtcbiAgICAgIFxuICAgICAgLy8gUmVwb3J0YXIgcHJvZ3Jlc28gY2FkYSAxMCVcbiAgICAgIGlmIChpICUgKGJ5dGVzLmxlbmd0aCAvIDEwIHwgMCkgPT09IDApIHtcbiAgICAgICAgc2VsZi5wb3N0TWVzc2FnZSh7IHR5cGU6ICdwcm9ncmVzcycsIHByb2dyZXNzOiAoaSAvIGJ5dGVzLmxlbmd0aCkgKiAxMDAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIGNvbnN0IGJhc2U2NCA9IGJ0b2EoYmluYXJ5KTtcbiAgICBzZWxmLnBvc3RNZXNzYWdlKHsgdHlwZTogJ3N1Y2Nlc3MnLCBiYXNlNjQgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgc2VsZi5wb3N0TWVzc2FnZSh7IHR5cGU6ICdlcnJvcicsIGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSk7XG4gIH1cbn07XG5cbmV4cG9ydCB7fTtcbiJdLCJuYW1lcyI6WyJzZWxmIiwib25tZXNzYWdlIiwiZSIsImZpbGUiLCJkYXRhIiwiYXJyYXlCdWZmZXIiLCJieXRlcyIsIlVpbnQ4QXJyYXkiLCJjaHVua1NpemUiLCJiaW5hcnkiLCJpIiwibGVuZ3RoIiwiY2h1bmsiLCJzdWJhcnJheSIsIk1hdGgiLCJtaW4iLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJwb3N0TWVzc2FnZSIsInR5cGUiLCJwcm9ncmVzcyIsImJhc2U2NCIsImJ0b2EiLCJlcnJvciIsIm1lc3NhZ2UiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(ssr)/./lib/base64-worker.ts\n");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval-source-map devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["(ssr)/./lib/base64-worker.ts"](0, __webpack_exports__, __webpack_require__);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;