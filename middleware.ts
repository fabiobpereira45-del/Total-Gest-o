import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protege todas as páginas do dashboard e módulos
  const protectedPaths = ['/dashboard', '/cadastro', '/cadastro-geral', '/credencial', '/carteira', '/certificado'];
  const isProtected = protectedPaths.some(path => pathname.startsWith(path));

  // Como o Supabase salva a sessão no localStorage do browser,
  // a autenticação final e redirecionamento são feitos client-side no useEffect.
  // Mas podemos adicionar um check inicial de cookie aqui se necessário.

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
