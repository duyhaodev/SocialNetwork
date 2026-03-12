
  import { createRoot } from "react-dom/client";
  import App from "./App.jsx";
  import "./index.css";
  import { Provider } from 'react-redux';
  import store from './app/store';
import { SocketProvider } from "./context/SocketContext.jsx";
  
  const rootElement = document.getElementById("root");
  if (rootElement) {
    createRoot(rootElement).render(
      <Provider store={store}>
        <SocketProvider>
          <App />
        </SocketProvider>
      </Provider>
  
  );
  }
  