/** Filet de sécurité : en cas d'erreur d'affichage, un message clair au lieu d'un écran vide. */
import { Component, type ReactNode } from 'react';

export class Secours extends Component<{ children: ReactNode }, { erreur: string | null }> {
  state = { erreur: null as string | null };
  static getDerivedStateFromError(e: unknown) { return { erreur: e instanceof Error ? e.message : String(e) }; }
  render() {
    if (!this.state.erreur) return this.props.children;
    const texte = encodeURIComponent(`Hémodyssée — Bug\n\nL'application s'est arrêtée : ${this.state.erreur}\nAppareil : ${navigator.userAgent}`);
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', color: '#e9eef8', background: '#070a12', fontFamily: 'system-ui' }}>
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Un problème est survenu</h1>
          <p style={{ opacity: 0.75, marginBottom: 18 }}>Rechargez la page. Si cela se reproduit, signalez-le en un clic.</p>
          <button onClick={() => location.reload()} style={{ padding: '10px 18px', borderRadius: 12, background: '#e0414e', color: '#fff', fontWeight: 700, marginRight: 8 }}>Recharger</button>
          <a href={`https://wa.me/221774144799?text=${texte}`} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 18px', borderRadius: 12, background: '#25d366', color: '#062b14', fontWeight: 700, textDecoration: 'none' }}>Signaler</a>
        </div>
      </div>
    );
  }
}
