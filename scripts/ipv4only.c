/*
 * ipv4only.c — force getaddrinfo() to resolve IPv4 (A records) only.
 *
 * WHY: the sandbox's IPv6 route to the outside broke (AAAA connections get
 * ECONNREFUSED / black-holed), so the Prisma query engine — which resolves
 * the Neon pooler hostname and tries the IPv6 addresses first — fails with
 * "Can't reach database server". Raw IPv4 + TLS to the same host works fine.
 *
 * Usage: gcc -shared -fPIC -O2 -o ipv4only.so ipv4only.c -ldl
 *        LD_PRELOAD=/home/z/my-project/scripts/ipv4only.so <command>
 *
 * Only the address FAMILY is narrowed; everything else (SNI, TLS, ports)
 * behaves exactly as before. Safe for all local/external lookups in this
 * environment because every remote service here is reachable over IPv4.
 */
#define _GNU_SOURCE
#include <dlfcn.h>
#include <netdb.h>
#include <sys/socket.h>
#include <string.h>

typedef int (*gai_fn)(const char *, const char *,
                      const struct addrinfo *, struct addrinfo **);

int getaddrinfo(const char *node, const char *service,
                const struct addrinfo *hints, struct addrinfo **res) {
    static gai_fn real = NULL;
    if (!real) {
        real = (gai_fn)dlsym(RTLD_NEXT, "getaddrinfo");
        if (!real) return EAI_FAIL;
    }
    struct addrinfo h;
    if (hints) {
        h = *hints;
    } else {
        memset(&h, 0, sizeof h);
        h.ai_socktype = SOCK_STREAM;
    }
    h.ai_family = AF_INET; /* IPv4 only */
    return real(node, service, &h, res);
}
