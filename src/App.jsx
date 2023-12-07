import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import { invoke } from '@tauri-apps/api/tauri'
import { open } from '@tauri-apps/api/dialog'
import { readDir, readTextFile } from '@tauri-apps/api/fs'

import './App.css'
import * as MarkdownIt from 'markdown-it'

import { styled } from '@mui/material/styles'
import { TextField, Button, Grid, Paper, Box } from '@mui/material'

function App() {
	const [greetMsg, setGreetMsg] = useState('')
	const [name, setName] = useState('')
	const [selectedDir, setSelectedDir] = useState('')
	const [listOfFiles, setListOfFiles] = useState([])
	const [filesWithContent, setFilesWithContent] = useState([])
	const [cards, setCards] = useState([])
	const [selectedCard, setSelectedCard] = useState({
		index: null,
		content: '',
	})
	const [deckName, setDeckName] = useState('')
	const [exportContent, setExportContent] = useState('')

	// Read in files
	useEffect(() => {
		if (selectedDir) {
			setFilesWithContent([])
			setListOfFiles([])
			const entries = readDir(selectedDir).then((entries) => {
				for (const entry of entries) {
					if (entry.children === undefined) {
						setListOfFiles((files) => [...files, entry.path])
					}
				}
			})

			// Set Deck name
			setDeckName(selectedDir.split('\\').pop())
		}
	}, [selectedDir])

	// Parses cards into Markdown
	useEffect(() => {
		let newCards = []
		if (filesWithContent.length > 0) {
			filesWithContent.forEach((file) => {
				newCards.push(...ParseMarkdownToCards(file))
			})
			setCards(newCards)
			setSelectedCard({ index: 0, content: newCards[0] })
		}
	}, [filesWithContent])

	useEffect(() => {
		if (selectedCard.index !== null) {
			//TODO: Yeah this is probably injection, which no good
			const container = (document.getElementById(
				'preview-container'
			).innerHTML = selectedCard.content)
		}
	}, [selectedCard])

	/**
	 * Turns Markdown into Anki friendly HTML.
	 * - Split Markdown into html sections split by `---`.
	 * - Add the H1 to each card for context
	 * - Replaces bolded text with clozes
	 *
	 * @param {string} input
	 * @returns
	 */
	function ParseMarkdownToCards(input) {
		var text = input
		var md = new MarkdownIt()

		// Get H1
		let cardTitle = text.split('\n')[0]

		// Split on ---
		let cardsInPage = text.toString().split('---')
	
		// Add H1 to each card for context
		cardsInPage = cardsInPage.map((cardText, index) => {
			if (index === 0) {
				return cardText
			}
			return cardTitle + '\n' + cardText
		})

		let htmlCards = []
		cardsInPage.forEach((card) => {
			let htmlPage = md.render(card)

			htmlPage = htmlPage
				.replace(/<strong>/gm, '{{c1::')
				.replace(/<\/strong>/gm, '}}')
			htmlPage = htmlPage
				.replace(/<h.>/gm, '<div style="text-align: left;"><strong>')
				.replace(/<\/h.>/gm, '</strong></div>')
			htmlPage = htmlPage
				.replace(/<h.>/gm, '<div style="text-align: left;"><strong>')
				.replace(/<\/h.>/gm, '</strong></div>')
			htmlCards.push(htmlPage)
		})

		return htmlCards
	}

	async function SelectFolder() {
		const selected = await open({
			directory: true,
			multiple: true,
			defaultPath: 'F:\\Users\\Neal\\Documents\\Obsidian\\Test Vault',
		})
		if (Array.isArray(selected)) {
			// user selected multiple directories
			setSelectedDir(selected[0])
		} else if (selected === null) {
			// user cancelled the selection
			console.warn('User Cancelled Folder Selection')
			setSelectedDir('')
		} else {
			console.error(
				'Unexpected error: User selected invalid dir',
				selected
			)
		}
	}

	function ReadFiles() {
		let filesWithContent = listOfFiles.map((filepath) => {
			let fileName = filepath
				.split('\\')
				[filepath.split('\\').length - 1].split('.')[0]
			return readTextFile(filepath).then((text) => {
				return `# ${fileName}\n${text}`
			})
		})
		Promise.all(filesWithContent).then((values) => {
			setFilesWithContent(values)
		})
	}

	const Item = styled(Paper)(({ theme }) => ({
		backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
		...theme.typography.body2,
		padding: theme.spacing(1),
		textAlign: 'center',
		color: theme.palette.text.secondary,
	}))

	return (
		<Box sx={{ flexGrow: 1 }}>
			<Grid container spacing={2}>
				<Grid item xs={6} md={8}>
					<Item>
						<div className='container'>
							<div
								id='preview-container'
								style={{ textAlign: 'left' }}
							></div>

							<Grid container spacing={2}>
								<Grid item xs={4} md={6}>
									<Button
										disabled={
											selectedCard.index == 0 ||
											cards.length === 0
										}
										onClick={() => {
											if (selectedCard.index >= 1) {
												setSelectedCard({
													index:
														selectedCard.index - 1,
													content:
														cards[
															selectedCard.index -
																1
														],
												})
											}
										}}
									>
										Previous
									</Button>
								</Grid>
								<Grid item xs={4} md={6}>
									<Button
										variant='contained'
										disabled={
											selectedCard.index ==
												cards.length - 1 ||
											cards.length === 0
										}
										onClick={() => {
											if (
												selectedCard.index <
												cards.length - 1
											) {
												setSelectedCard({
													index:
														selectedCard.index + 1,
													content:
														cards[
															selectedCard.index +
																1
														],
												})
											}
										}}
									>
										Next
									</Button>
								</Grid>
							</Grid>
						</div>
					</Item>
				</Grid>
				<Grid item xs={6} md={4}>
					<Item>
						<Button
							onClick={async () => {
								await SelectFolder()
							}}
						>
							Select folder
						</Button>
						<TextField
							id='folder-path'
							label='Folder Path'
							variant='outlined'
							disabled
							value={selectedDir}
							onChange={(e) => {
								setSelectedDir(e.target.value)
							}}
						/>
						<TextField
							id='deck-name'
							label='Deck Name'
							variant='outlined'

						/>
						<Button
							type='submit'
							disabled={selectedDir === ''}
							onClick={() => {
								ReadFiles()
							}}
						>
							Preview
						</Button>
						<Button
							type='submit'
							disabled={selectedCard.index === null}
							onClick={() => {
								let newCardContent = '#separator:tab'
									+ "\n#html:true"
									+ "\n#notetype column:1"
									+ "\n#deck column:2"
									+ "\n#tags column:5`"
								cards.forEach((card) => {
									newCardContent += `\nCloze\t${deckName}\t"${card}"\t`
								})
								console.log(newCardContent)
							}}
						>
							Export
						</Button>
					</Item>
				</Grid>
			</Grid>
		</Box>
	)
}

export default App
