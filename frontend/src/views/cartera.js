import { $ } from '../dom.js';
import { estado, suscribir } from '../store.js';
import { abreviar } from '../format.js';
import { animarNumero } from '../ui.js';

const CIRCUNFERENCIA = 2 * Math.PI * 52;

function pintarAnillo(d) {
  const anillo = $('quotaRing');
  anillo.style.strokeDasharray = String(CIRCUNFERENCIA);
  if (!d) {
    anillo.style.strokeDashoffset = String(CIRCUNFERENCIA);
    $('ticketsLeft').textContent = '—';
    $('ticketsLimitHint').textContent = 'Conecta MetaMask para ver tu cupo.';
    return;
  }
  const maximo = d.maxPorUsuario;
  const usados = Math.min(maximo, Math.max(0, maximo - Number(d.restantes)));
  anillo.style.strokeDashoffset = String(CIRCUNFERENCIA * (1 - usados / maximo));
  animarNumero($('ticketsLeft'), d.restantes);
  $('ticketsLimitHint').textContent = `Has usado ${usados} de ${maximo} boletos permitidos por participante.`;
}

function tarjetaBoleto(boleto, d) {
  const tarjeta = document.createElement('article');
  tarjeta.className = 'ticket-stub';
  const gano = d.sorteoRealizado && d.boletoGanador === boleto.id;
  if (gano) tarjeta.classList.add('is-winner');
  if (!boleto.esMio) tarjeta.classList.add('is-transferred');

  const numero = document.createElement('div');
  numero.className = 'stub-number';
  numero.innerHTML = '<small>BOLETO</small>';
  const cifra = document.createElement('strong');
  cifra.textContent = `#${boleto.id}`;
  numero.append(cifra);

  const detalle = document.createElement('div');
  detalle.className = 'stub-detail';
  const estadoTexto = document.createElement('span');
  estadoTexto.textContent = gano ? 'Boleto ganador' : boleto.esMio ? 'Lo posees' : 'Transferido';
  const titular = document.createElement('code');
  titular.textContent = boleto.esMio ? 'Titular: tú' : `Titular: ${abreviar(boleto.titularActual)}`;
  detalle.append(estadoTexto, titular);

  tarjeta.append(numero, detalle);
  return tarjeta;
}

function pintar() {
  const d = estado.datos;
  pintarAnillo(d);
  const lista = $('ticketsList');
  lista.replaceChildren();
  if (!d) {
    animarSinDatos();
    const vacio = document.createElement('p');
    vacio.className = 'empty-state';
    vacio.textContent = 'Conecta MetaMask para ver tus boletos.';
    lista.append(vacio);
    return;
  }
  animarNumero($('myTicketsCount'), d.misBoletos.length);
  if (!d.misBoletos.length) {
    const vacio = document.createElement('p');
    vacio.className = 'empty-state';
    vacio.textContent = 'Aún no tienes boletos. Compra el primero desde «Jugar».';
    lista.append(vacio);
    return;
  }
  d.misBoletos.forEach((boleto) => lista.append(tarjetaBoleto(boleto, d)));
}

function animarSinDatos() {
  $('myTicketsCount').textContent = '0';
  delete $('myTicketsCount').dataset.valor;
}

export function iniciarCartera() {
  suscribir(pintar);
  pintar();
}
