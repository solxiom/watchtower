#!/bin/sh
# CA-12 cataloged Git leaf. Argv-only: the owning TaskHandler is the only
# caller (through LeafRuntimeInvoker/TaskLeafCapability), and it always
# supplies a closed, fully-constructed argv from validated typed fields —
# this script performs no interpolation, no shell evaluation, and accepts no
# remote/refspec/config selection of its own.
exec git "$@"
