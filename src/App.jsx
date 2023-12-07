import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import { invoke } from '@tauri-apps/api/tauri'
import { open } from '@tauri-apps/api/dialog'
import { readDir, readTextFile} from '@tauri-apps/api/fs'

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
		}
	}, [selectedDir])

	useEffect(() => {
		let newCards = []
		if(filesWithContent.length > 0){
			filesWithContent.forEach((file)=>{
				newCards.push([...ParseMarkdownToCards(file)])
			})
			setCards(newCards)
			console.log(newCards)
		}

	}, [filesWithContent])

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
		console.log(cardTitle)
		// Add H1 to each card for context
		cardsInPage = cardsInPage.map((cardText, index) => {
			if(index === 0){
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
		htmlCards.forEach((card) => {
			console.log(card)
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

	function ReadFiles(){
		let filesWithContent = listOfFiles.map(filepath=>{
			let fileName = filepath.split('\\')[filepath.split('\\').length-1].split('.')[0]
			return readTextFile(filepath).then(text =>{return `# ${fileName}\n${text}`})
		})
		Promise.all(filesWithContent).then((values)=>{
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
							<h1>Welcome to Tauri!</h1>
							<textarea id='markdown-input'></textarea>
							<Button
								type='submit'
								disabled = {selectedDir === ''}
								onClick={() => {
									// ParseMarkdownToCards(
									// 	document.getElementById(
									// 		'markdown-input'
									// 	).value
									// )
									ReadFiles()
								}}
							>
								Parse
							</Button>
							{/* <Grid container spacing={2}>
								<Grid item xs={4} md={6}><Button>Previous</Button></Grid>
								<Grid item xs={4} md={6}><Button variant='contained'>Next</Button></Grid>
							</Grid> */}
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
					</Item>
				</Grid>
			</Grid>
		</Box>
	)
}

export default App
