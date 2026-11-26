import './style.css';
import { iniciarToast } from './toast.js';
import { iniciarShell } from './views/shell.js';
import { iniciarJugar } from './views/jugar.js';
import { iniciarCartera } from './views/cartera.js';
import { iniciarRonda } from './views/ronda.js';
import { iniciarModalConfirmacion } from './modal.js';
import { iniciarAdmin } from './views/admin.js';

iniciarToast();
iniciarJugar();
iniciarCartera();
iniciarRonda();
iniciarModalConfirmacion();
iniciarAdmin();
iniciarShell();
