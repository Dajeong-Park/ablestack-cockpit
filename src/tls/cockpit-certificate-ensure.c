#include <assert.h>
#include <err.h>
#include <stdbool.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include <common/cockpitwebcertificate.h>

#include "certificate.h"
#include "utils.h"

// Renew certificates with less than 30 days validity
#define EXPIRY_THRESHOLD (30 * 24 * 60 * 60)

static bool
check_expiry (const char *filename,
              bool        verbose)
{
  Certificate *certificate = certificate_load (filename);

  time_t expires = certificate_get_expiry (certificate);

  debug (ENSURE, "Certificate %s expires %ld", filename, (long) expires);

  certificate_unref (certificate);

  time_t last_valid_expiry = time (NULL) + EXPIRY_THRESHOLD;
  if (expires < last_valid_expiry)
    {
      debug (ENSURE, "Certificate %s expires %ld, which is before %ld",
             filename, (long) expires, (long) last_valid_expiry);

      if (verbose)
        printf ("Would renew %s\n", filename);

      return false;
    }

   debug (ENSURE, "Certificate %s expires %ld, which is after %ld",
          filename, (long) expires, (long) last_valid_expiry);

  return true;
}

static bool
have_certificate (bool verbose)
{
  char *error = NULL;
  char *filename = cockpit_certificate_locate (true, &error);

  if (error != NULL)
    errx (EXIT_FAILURE, "%s", error);

  if (filename == NULL)
    {
      debug (ENSURE, "Couldn't locate any certificate");

      if (verbose)
        printf ("No certificate found\n");

      return false;
    }

  if (strstr (filename, "/0-self-signed.cert"))
    {
      debug (ENSURE, "Certificate is self-signed, checking expiry");
      if (!check_expiry (filename, verbose))
        return false;
    }

  debug (ENSURE, "Certificate looks good: %s", filename);

  if (verbose)
    printf ("Would use certificate: %s\n", filename);

  return true;
}

#define COCKPIT_CERTIFICATE_HELPER   LIBEXECDIR "/cockpit-certificate-helper"

int
main (int argc, char **argv)
{
  bool check = false;

  if (argc == 1)
    ;
  else if (argc == 2 && strcmp (argv[1], "--check") == 0)
    check = true;
  else
    errx (EXIT_FAILURE, "usage: %s [--check]", argv[0]);

  if (have_certificate (check))
    return 0;

  if (check)
    return 1;

  debug (ENSURE, "Calling %s to create a certificate", COCKPIT_CERTIFICATE_HELPER);

  execl (COCKPIT_CERTIFICATE_HELPER, COCKPIT_CERTIFICATE_HELPER, "selfsign", NULL);
  err (EXIT_FAILURE, "execl: " COCKPIT_CERTIFICATE_HELPER);
}
