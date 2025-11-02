// ========================================
// EXEMPLO DE INTEGRAÇÃO COMPLETA
// ========================================

// Este arquivo contém exemplos práticos de como integrar
// o endpoint /userinfo no seu processo de onboarding

// ========================================
// 1. FUNÇÃO HELPER PARA BUSCAR DADOS DO USUÁRIO
// ========================================

/**
 * Busca informações completas do usuário
 * @param userId - ID único do usuário no sistema OpenAuth
 * @returns Objeto com todas as informações do usuário
 */
async function fetchUserInfo(userId: string) {
  const baseUrl = process.env.AUTH_WORKER_URL || "http://localhost:8787";
  
  try {
    const response = await fetch(`${baseUrl}/userinfo?user_id=${userId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const userInfo = await response.json();
    return userInfo;
  } catch (error) {
    console.error("Erro ao buscar informações do usuário:", error);
    throw error;
  }
}

// ========================================
// 2. COMPONENTE REACT - TELA DE BOAS-VINDAS
// ========================================

import React, { useEffect, useState } from 'react';

interface UserInfo {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  provider: string;
  provider_id?: string;
  created_at: string;
  updated_at: string;
}

function WelcomeScreen({ userId }: { userId: string }) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserInfo() {
      try {
        const data = await fetchUserInfo(userId);
        setUserInfo(data);
      } catch (err) {
        setError("Não foi possível carregar suas informações.");
      } finally {
        setLoading(false);
      }
    }

    loadUserInfo();
  }, [userId]);

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (error || !userInfo) {
    return <div>Erro: {error}</div>;
  }

  return (
    <div className="welcome-container">
      <div className="avatar-section">
        {userInfo.avatar_url ? (
          <img 
            src={userInfo.avatar_url} 
            alt={userInfo.name || 'Avatar'} 
            className="avatar-large"
          />
        ) : (
          <div className="avatar-placeholder">
            {userInfo.name?.charAt(0).toUpperCase() || '?'}
          </div>
        )}
      </div>
      
      <h1>Bem-vindo, {userInfo.name || 'Usuário'}!</h1>
      <p className="subtitle">
        Você entrou via {userInfo.provider}
      </p>
      
      <div className="user-details">
        <p><strong>Email:</strong> {userInfo.email}</p>
        <p><strong>Conta criada em:</strong> {new Date(userInfo.created_at).toLocaleDateString()}</p>
      </div>
      
      <button className="btn-continue">
        Continuar para o App
      </button>
    </div>
  );
}

export default WelcomeScreen;

// ========================================
// 3. NEXT.JS API ROUTE - PROXY SEGURO
// ========================================

// pages/api/user/[userId].ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Validação: usuário só pode acessar seus próprios dados
  const requestedUserId = req.query.userId as string;
  const sessionUserId = req.session?.user?.id; // Assumindo que você tem sessão configurada
  
  if (requestedUserId !== sessionUserId) {
    return res.status(403).json({ error: "Forbidden" });
  }
  
  // Buscar dados do Worker OpenAuth
  const authWorkerUrl = process.env.AUTH_WORKER_URL!;
  
  try {
    const response = await fetch(`${authWorkerUrl}/userinfo?user_id=${requestedUserId}`);
    
    if (!response.ok) {
      return res.status(response.status).json({ error: "User not found" });
    }
    
    const userInfo = await response.json();
    
    // Retornar apenas os dados necessários (sem expor tudo)
    return res.status(200).json({
      email: userInfo.email,
      name: userInfo.name,
      avatar: userInfo.avatar_url,
      provider: userInfo.provider,
    });
  } catch (error) {
    console.error("Error fetching user info:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ========================================
// 4. EXPRESS.JS MIDDLEWARE - ENRIQUECER REQUEST
// ========================================

import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  userInfo?: UserInfo;
}

/**
 * Middleware que busca e anexa informações do usuário ao request
 */
async function enrichWithUserInfo(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.user?.id; // Assumindo autenticação prévia
  
  if (!userId) {
    return next(); // Não há usuário autenticado
  }
  
  try {
    const userInfo = await fetchUserInfo(userId);
    req.userInfo = userInfo;
    next();
  } catch (error) {
    console.error("Failed to enrich request with user info:", error);
    next(); // Continuar mesmo se falhar
  }
}

// Uso:
// app.use(enrichWithUserInfo);
// 
// app.get('/dashboard', (req: AuthenticatedRequest, res) => {
//   const userName = req.userInfo?.name || 'Usuário';
//   res.render('dashboard', { userName });
// });

// ========================================
// 5. SINCRONIZAÇÃO COM BANCO DE DADOS LOCAL
// ========================================

import { prisma } from './lib/prisma'; // Exemplo com Prisma

/**
 * Sincroniza dados do OpenAuth com banco de dados local
 */
async function syncUserToDatabase(userId: string) {
  const userInfo = await fetchUserInfo(userId);
  
  // Upsert no banco local
  const user = await prisma.user.upsert({
    where: { openauth_id: userId },
    update: {
      email: userInfo.email,
      name: userInfo.name,
      avatar_url: userInfo.avatar_url,
      provider: userInfo.provider,
      provider_id: userInfo.provider_id,
      last_login: new Date(),
      updated_at: new Date(),
    },
    create: {
      openauth_id: userId,
      email: userInfo.email,
      name: userInfo.name,
      avatar_url: userInfo.avatar_url,
      provider: userInfo.provider,
      provider_id: userInfo.provider_id,
      onboarding_completed: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  
  return user;
}

// Uso após login:
// const user = await syncUserToDatabase(userId);
// console.log(`User ${user.name} synced to database`);

// ========================================
// 6. HOOK CUSTOMIZADO REACT - useFetchUserInfo
// ========================================

import { useState, useEffect } from 'react';

function useUserInfo(userId: string | null) {
  const [data, setData] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const userInfo = await fetchUserInfo(userId);
        if (!cancelled) {
          setData(userInfo);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { data, loading, error };
}

// Uso:
// function MyComponent() {
//   const { data: userInfo, loading, error } = useUserInfo(userId);
//   
//   if (loading) return <Spinner />;
//   if (error) return <Error message={error.message} />;
//   
//   return <div>Welcome, {userInfo?.name}!</div>;
// }

// ========================================
// 7. FLUXO COMPLETO DE ONBOARDING
// ========================================

/**
 * Gerencia o processo completo de onboarding
 */
class OnboardingService {
  
  /**
   * Passo 1: Buscar dados do usuário
   */
  static async fetchUserData(userId: string) {
    return await fetchUserInfo(userId);
  }
  
  /**
   * Passo 2: Criar perfil inicial
   */
  static async createInitialProfile(userInfo: UserInfo) {
    return await prisma.profile.create({
      data: {
        user_id: userInfo.id,
        display_name: userInfo.name,
        bio: '',
        preferences: {},
        onboarding_step: 1,
      }
    });
  }
  
  /**
   * Passo 3: Enviar email de boas-vindas
   */
  static async sendWelcomeEmail(userInfo: UserInfo) {
    const emailService = getEmailService();
    
    await emailService.send({
      to: userInfo.email,
      subject: `Bem-vindo, ${userInfo.name}!`,
      template: 'welcome',
      data: {
        name: userInfo.name,
        avatar: userInfo.avatar_url,
        provider: userInfo.provider,
      }
    });
  }
  
  /**
   * Passo 4: Registrar evento de analytics
   */
  static async trackSignup(userInfo: UserInfo) {
    const analytics = getAnalyticsService();
    
    analytics.track('user_signed_up', {
      user_id: userInfo.id,
      email: userInfo.email,
      provider: userInfo.provider,
      has_name: !!userInfo.name,
      has_avatar: !!userInfo.avatar_url,
    });
  }
  
  /**
   * Executa todo o fluxo de onboarding
   */
  static async completeOnboarding(userId: string) {
    try {
      // 1. Buscar dados
      const userInfo = await this.fetchUserData(userId);
      
      // 2. Criar perfil
      await this.createInitialProfile(userInfo);
      
      // 3. Enviar email (não-bloqueante)
      this.sendWelcomeEmail(userInfo).catch(console.error);
      
      // 4. Analytics (não-bloqueante)
      this.trackSignup(userInfo).catch(console.error);
      
      return { success: true, userInfo };
    } catch (error) {
      console.error("Onboarding failed:", error);
      return { success: false, error };
    }
  }
}

// Uso após autenticação:
// const result = await OnboardingService.completeOnboarding(userId);
// if (result.success) {
//   redirect('/dashboard');
// }

// ========================================
// 8. VALIDAÇÃO E TRANSFORMAÇÃO DE DADOS
// ========================================

import { z } from 'zod';

// Schema de validação
const UserInfoSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().optional(),
  avatar_url: z.string().url().optional(),
  provider: z.enum(['github', 'google', 'microsoft', 'password']),
  provider_id: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * Busca e valida informações do usuário
 */
async function fetchValidatedUserInfo(userId: string) {
  const rawData = await fetchUserInfo(userId);
  
  // Validar dados
  const validatedData = UserInfoSchema.parse(rawData);
  
  // Transformar para formato interno
  return {
    ...validatedData,
    displayName: validatedData.name || validatedData.email.split('@')[0],
    initials: validatedData.name
      ?.split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase() || '?',
    isExternal: validatedData.provider !== 'password',
  };
}

// ========================================
// 9. CACHE COM REDIS/KV
// ========================================

/**
 * Busca com cache (exemplo usando Cloudflare KV)
 */
async function fetchUserInfoWithCache(userId: string, env: Env) {
  const cacheKey = `userinfo:${userId}`;
  
  // Tentar buscar do cache
  const cached = await env.USER_CACHE.get(cacheKey, 'json');
  if (cached) {
    console.log('Cache hit for user:', userId);
    return cached;
  }
  
  // Buscar do banco
  console.log('Cache miss for user:', userId);
  const userInfo = await fetchUserInfo(userId);
  
  // Armazenar no cache (TTL: 5 minutos)
  await env.USER_CACHE.put(cacheKey, JSON.stringify(userInfo), {
    expirationTtl: 300,
  });
  
  return userInfo;
}

// ========================================
// 10. TESTES UNITÁRIOS
// ========================================

import { describe, it, expect, vi } from 'vitest';

describe('fetchUserInfo', () => {
  it('deve buscar informações do usuário com sucesso', async () => {
    const mockUserId = 'abc123';
    const mockResponse = {
      id: mockUserId,
      email: 'test@example.com',
      name: 'Test User',
      provider: 'github',
    };
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });
    
    const result = await fetchUserInfo(mockUserId);
    
    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/userinfo?user_id=${mockUserId}`)
    );
  });
  
  it('deve lançar erro quando usuário não for encontrado', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });
    
    await expect(fetchUserInfo('invalid-id')).rejects.toThrow('HTTP 404');
  });
});

// ========================================
// FIM DOS EXEMPLOS
// ========================================

export {
  fetchUserInfo,
  WelcomeScreen,
  enrichWithUserInfo,
  syncUserToDatabase,
  useUserInfo,
  OnboardingService,
  fetchValidatedUserInfo,
  fetchUserInfoWithCache,
};
