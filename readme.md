<h1 align="center">
  <br>
  <a href="https://ivaprime.com"><img src="IVA Prime logo.png" width="220"></a>
  <br>
  <b>IVA Prime</b>
  <br>
</h1>

<p align="center">
  <a href="https://academic.oup.com/nar/advance-article/doi/10.1093/nar/gkaf386/8124940"><img src="https://img.shields.io/badge/DOI-10.1093/nar/gkaf386-red" alt="DOI"></a>
  <a href="https://ivaprime.com"><img src="https://img.shields.io/badge/IVA%20Prime-Web_App-8A2BE2" alt="Web App"></a>
  <a href="https://github.com/RaduLeonte/IVA-Prime/releases"><img src="https://img.shields.io/github/v/release/RaduLeonte/IVA-Prime?label=Desktop%20App" alt="Releases"></a>
</p>

---

## General Information

Welcome to the IVA Prime repository!

IVA Prime allows you to import plasmid files (`.gb` and `.dna`), and then easily generate primers for IVA cloning as you edit your plasmid file. The primers can then be exported to a ready-to-order format, and the altered plasmid file can be saved.

IVA Prime is described in detail in our recent publication: Leonte et al. [Nucleic Acids Research 2024](https://doi.org/10.1093/nar/gkaf386) <a style="vertical-align: middle" href="https://www.nature.com/articles/srep27459"><img src="https://img.shields.io/badge/DOI-10.1093/nar/gkaf386-red"></a>

The primer design technique is originally based on the work by García-Nafría et al.: <a style="vertical-align: middle" href="https://www.nature.com/articles/srep27459"><img src="https://img.shields.io/badge/DOI-10.1038/srep27459-green"></a>

You can use IVA Prime in your browser or as a desktop app:

- **Online Web App:** [ivaprime.com](https://ivaprime.com)
- **Desktop App:** [Download the latest release](https://github.com/RaduLeonte/IVA-Prime/releases)


## How to use

> **Note:**  
> The latest version of IVA Prime is available online at [ivaprime.com](https://ivaprime.com).  
> For local installation, see [Installation](#installation).

### Opening plasmid files

Plasmid files can be imported using either the "Import File" button or by dragging them onto the page. IVA Prime currently supports the `.gb`, `.gbk`, `.dna`, and `.fasta` file formats. Alternatively, a new file can be generated from a DNA sequence by pressing the "New File" button. By clicking on "Try Demo File", a pET-28a plasmid will be loaded for users to try out features.

Once a plasmid file has been imported, its DNA sequence can be edited similarly to editing a text document.

### IVA Cloning Operations

#### Insertions

For simple insertions, the position where the new sequence should be inserted can be selected by left clicking. The currently selected position is indicated by a vertical line. Then, right-click anywhere in the sequence to bring up the context menu. Select "Insert here". A window will pop up to ask for a DNA or AA sequence. If an AA sequence is provided, it will be optimized for the selected organism.

#### Mutations

Select a region in the DNA sequence by pressing left-click and dragging the mouse while holding left-click. The selection can be adjusted by dragging the cursors on each side. Once the region to be mutated is selected, right-click to open the context menu and select "Mutate selection". The DNA or AA sequence to replace the selected bases can then be specified. If an AA sequence is provided, it will be optimized for the selected organism.

#### Deletions

Select the region to be deleted as described in the previous section. Right-click and select "Delete selection" in the context menu.

#### Subcloning

For subcloning, import the two plasmid files on the same browser page. In the plasmid containing the region to be subcloned, select the sequence. Then right-click and select "Mark selection for subcloning". Switch over to the target vector. If the sequence to be subcloned should be inserted a specific position, left-click at the wanted position. If the sequence to be subcloned should replace a region in the target vector, select that region. Right-click and select "Subclone into selection".

Additionally, insertions can be added to the subcloning target in the same operation. In the last step, select instead "Subclone with insertion into selection". In the window that pops up, DNA or AA sequences can be specified which will be added to either the 5' or 3' end of the subcloning target. If an AA sequence is provided, it will be optimized for the selected organism.

## Installation

### Desktop Tauri App

#### Easy installation (Recommended)

Just download the installer for your platform from the latest releases page:

- **Windows:** `.exe`
- **macOS:** `.dmg`
  - For **Intel Macs**: download the `x64` version
  - For **Apple Silicon (M1/M2)**: download the `arm64` version
- **Linux:** `.AppImage`

Run the installer and follow the on-screen instructions.

#### Build It Yourself (Advanced)

If you want to build the Tauri app from source, you’ll need [Node.js](https://nodejs.org/), [Rust](https://www.rust-lang.org/tools/install), and the [Tauri prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites/). Then run:

```bash
git clone https://github.com/RaduLeonte/IVA-Prime
cd IVA-Prime/tauri/iva-prime
npm install
npm run tauri build
```

### Local Web App using Docker

IVA Prime can be installed locally using [Git](https://git-scm.com/) and [Docker](https://www.docker.com/).

> **Note:** On some systems, Docker Desktop does not include `docker-compose`. Make sure it is installed.

Once Docker is ready, open your terminal and run:

```bash
git clone https://github.com/RaduLeonte/IVA-Prime
cd IVA-Prime/docker
docker-compose up --build
```

The web app is now running locally on your computer and can be accessed by going the following address in your web browser:

```
https://localhost:8000
```
> **Note:**  
> The web app must be relaunched after rebooting.



## License

- [**GPL-3.0 license**](https://github.com/RaduLeonte/IVA-Prime/blob/master/LICENSE)



## Citation

If you use IVA Prime in your research, please cite our recent publication describing the tool:  
Leonte et al. [Nucleic Acids Research 2024](https://doi.org/10.1093/nar/gkaf386) <a style="vertical-align: middle" href="https://www.nature.com/articles/srep27459"><img src="https://img.shields.io/badge/DOI-10.1093/nar/gkaf386-red"></a>

You may also reference the original primer design method:  
García-Nafría et al., [Nature Scientific Reports 2016](https://www.nature.com/articles/srep27459) <a style="vertical-align: middle" href="https://www.nature.com/articles/srep27459"><img src="https://img.shields.io/badge/DOI-10.1038/srep27459-green"></a>