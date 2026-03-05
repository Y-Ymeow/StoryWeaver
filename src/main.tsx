import { render } from 'preact'
import { App } from './app'
import './assets/app.css'

if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
    });
  });
}

render(<App />, document.getElementById('app')!)
