"""Wrap the Maven benchmark command and sample simultaneous test-JVM + Node RSS.

Python standard library only; supports Windows and Linux. Sampling is outside the
measured JVM. The test's phase marker identifies its JVM, excluding Maven/servers.
"""
import argparse
import csv
import ctypes
import json
import os
from pathlib import Path
import subprocess
import sys
import time


if os.name == "nt":
    from ctypes import wintypes

    class ProcessEntry(ctypes.Structure):
        _fields_ = [("size", wintypes.DWORD), ("usage", wintypes.DWORD),
                    ("pid", wintypes.DWORD), ("heap", ctypes.c_size_t),
                    ("module", wintypes.DWORD), ("threads", wintypes.DWORD),
                    ("parent", wintypes.DWORD), ("priority", wintypes.LONG),
                    ("flags", wintypes.DWORD), ("exe", wintypes.WCHAR * 260)]

    class MemoryCounters(ctypes.Structure):
        _fields_ = [("size", wintypes.DWORD), ("faults", wintypes.DWORD)] + [
            (name, ctypes.c_size_t) for name in (
                "peak_rss", "rss", "peak_paged", "paged", "peak_nonpaged",
                "nonpaged", "pagefile", "peak_pagefile", "private")]

    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    psapi = ctypes.WinDLL("psapi", use_last_error=True)
    kernel.CreateToolhelp32Snapshot.restype = wintypes.HANDLE
    kernel.OpenProcess.restype = wintypes.HANDLE
    kernel.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
    kernel.Process32FirstW.argtypes = [wintypes.HANDLE, ctypes.POINTER(ProcessEntry)]
    kernel.Process32NextW.argtypes = [wintypes.HANDLE, ctypes.POINTER(ProcessEntry)]
    kernel.CloseHandle.argtypes = [wintypes.HANDLE]
    psapi.GetProcessMemoryInfo.argtypes = [wintypes.HANDLE, ctypes.POINTER(MemoryCounters), wintypes.DWORD]

    def processes():
        snapshot = kernel.CreateToolhelp32Snapshot(2, 0)
        if snapshot == ctypes.c_void_p(-1).value:
            raise ctypes.WinError(ctypes.get_last_error())
        try:
            entry = ProcessEntry()
            entry.size = ctypes.sizeof(entry)
            ok = kernel.Process32FirstW(snapshot, ctypes.byref(entry))
            result = {}
            while ok:
                result[entry.pid] = (entry.parent, entry.exe.lower())
                ok = kernel.Process32NextW(snapshot, ctypes.byref(entry))
            return result
        finally:
            kernel.CloseHandle(snapshot)

    def rss(pid):
        handle = kernel.OpenProcess(0x410, False, pid)
        if not handle:
            return 0  # Process can exit between discovery and sampling.
        try:
            memory = MemoryCounters()
            memory.size = ctypes.sizeof(memory)
            if not psapi.GetProcessMemoryInfo(handle, ctypes.byref(memory), memory.size):
                raise ctypes.WinError(ctypes.get_last_error())
            return memory.rss
        finally:
            kernel.CloseHandle(handle)
else:
    def processes():
        result = {}
        for directory in Path("/proc").iterdir():
            if not directory.name.isdigit():
                continue
            try:
                stat = (directory / "stat").read_text()
                result[int(directory.name)] = (int(stat[stat.rfind(")") + 2:].split()[1]),
                                               (directory / "comm").read_text().strip())
            except (FileNotFoundError, ProcessLookupError, PermissionError):
                pass
        return result

    def rss(pid):
        try:
            return int(Path(f"/proc/{pid}/statm").read_text().split()[1]) * os.sysconf("SC_PAGE_SIZE")
        except (FileNotFoundError, ProcessLookupError):
            return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("its/ruling/target/context-cache"))
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command[1:] if args.command[:1] == ["--"] else args.command
    if not command:
        parser.error("provide a Maven command after --")
    args.output.mkdir(parents=True, exist_ok=True)
    if (args.output / "project").exists():
        parser.error("output already contains a project; use a fresh output directory")
    if os.name == "nt" and command[0].lower().endswith((".cmd", ".bat")):
        command = subprocess.list2cmdline([os.environ["COMSPEC"], "/d", "/s", "/c"]) + ' "' + subprocess.list2cmdline(command) + '"'
    peaks = {}
    with (args.output / "maven.log").open("w", encoding="utf8") as log, (args.output / "rss.csv").open("w", newline="") as samples:
        writer = csv.writer(samples)
        writer.writerow(["epoch_seconds", "phase", "java_rss_bytes", "node_rss_bytes", "aggregate_rss_bytes"])
        process = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT)
        try:
            while process.poll() is None:
                start = time.monotonic()
                try:
                    phase = json.loads((args.output / "phase.json").read_text())
                except (FileNotFoundError, json.JSONDecodeError):
                    time.sleep(0.1)
                    continue
                tree = processes()
                descendants = {phase["pid"]}
                while True:
                    extended = descendants | {pid for pid, (parent, _) in tree.items() if parent in descendants}
                    if extended == descendants:
                        break
                    descendants = extended
                java = rss(phase["pid"])
                node = sum(rss(pid) for pid in descendants if tree.get(pid, (0, ""))[1] in ("node", "node.exe"))
                total = java + node
                writer.writerow([time.time(), phase["phase"], java, node, total])
                samples.flush()
                peak = peaks.setdefault(phase["phase"], {"samples": 0, "peakJavaBytes": 0, "peakNodeBytes": 0, "peakAggregateBytes": 0})
                peak["samples"] += 1
                peak["peakJavaBytes"] = max(peak["peakJavaBytes"], java)
                peak["peakNodeBytes"] = max(peak["peakNodeBytes"], node)
                peak["peakAggregateBytes"] = max(peak["peakAggregateBytes"], total)
                time.sleep(max(0, 0.1 - (time.monotonic() - start)))
        finally:
            (args.output / "memory.json").write_text(json.dumps(peaks, indent=2))
            if process.poll() is None:
                process.terminate()
    print(json.dumps(peaks, indent=2))
    return process.returncode


if __name__ == "__main__":
    sys.exit(main())
