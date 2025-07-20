'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  WifiIcon, 
  CreditCardIcon, 
  ChartBarIcon, 
  ShieldCheckIcon,
  ArrowRightIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

export default function HomePage() {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const features = [
    {
      icon: WifiIcon,
      title: 'Tickets Wi-Fi Instantanés',
      description: 'Achetez et recevez vos tickets Wi-Fi en quelques secondes via Mobile Money.'
    },
    {
      icon: CreditCardIcon,
      title: 'Paiement Mobile Money',
      description: 'Paiement sécurisé via MTN, Moov et Orange Money.'
    },
    {
      icon: ChartBarIcon,
      title: 'Statistiques Détaillées',
      description: 'Suivez vos ventes et revenus en temps réel avec des graphiques interactifs.'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Sécurité Garantie',
      description: 'Transactions sécurisées et protection anti-fraude avancée.'
    }
  ];

  const stats = [
    { label: 'Tickets Vendus', value: '10,000+' },
    { label: 'Vendeurs Actifs', value: '500+' },
    { label: 'Clients Satisfaits', value: '25,000+' },
    { label: 'Taux de Satisfaction', value: '98%' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Navigation */}
      <nav className="relative z-10 px-4 py-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <WifiIcon className="h-8 w-8 text-primary-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">WiFiZone</span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-gray-600 hover:text-primary-600 transition-colors">
              Fonctionnalités
            </Link>
            <Link href="#pricing" className="text-gray-600 hover:text-primary-600 transition-colors">
              Tarifs
            </Link>
            <Link href="#contact" className="text-gray-600 hover:text-primary-600 transition-colors">
              Contact
            </Link>
            <Link href="/auth/login" className="btn-secondary">
              Connexion
            </Link>
            <Link href="/auth/register" className="btn-primary">
              S'inscrire
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl"
            >
              Vendez vos{' '}
              <span className="gradient-text">Tickets Wi-Fi</span>
              <br />
              en toute simplicité
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mt-6 text-lg leading-8 text-gray-600 max-w-3xl mx-auto"
            >
              Plateforme complète pour les revendeurs de tickets Hotspot. 
              Créez, vendez et gérez vos tickets Wi-Fi avec paiement Mobile Money intégré.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-10 flex items-center justify-center gap-x-6"
            >
              <Link href="/auth/register" className="btn-primary btn-lg">
                Commencer gratuitement
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Link>
              <button 
                onClick={() => setIsVideoPlaying(true)}
                className="btn-secondary btn-lg"
              >
                <PlayIcon className="mr-2 h-5 w-5" />
                Voir la démo
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl font-bold text-primary-600">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Tout ce dont vous avez besoin pour réussir
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Une plateforme complète pour gérer vos ventes de tickets Wi-Fi
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card p-6 text-center"
              >
                <feature.icon className="h-12 w-12 text-primary-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Prêt à commencer ?
          </h2>
          <p className="mt-4 text-lg text-primary-100">
            Rejoignez des milliers de vendeurs qui font confiance à WiFiZone
          </p>
          <div className="mt-8">
            <Link href="/auth/register" className="btn-lg bg-white text-primary-600 hover:bg-gray-100">
              Créer mon compte gratuitement
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center">
                <WifiIcon className="h-8 w-8 text-primary-400" />
                <span className="ml-2 text-xl font-bold">WiFiZone</span>
              </div>
              <p className="mt-4 text-gray-400">
                La plateforme de référence pour la vente de tickets Wi-Fi en Afrique.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Produit</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-white transition-colors">Fonctionnalités</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition-colors">Tarifs</Link></li>
                <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/support" className="hover:text-white transition-colors">Centre d'aide</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/status" className="hover:text-white transition-colors">Statut</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Légal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Confidentialité</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Conditions</Link></li>
                <li><Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; 2024 WiFiZone. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 