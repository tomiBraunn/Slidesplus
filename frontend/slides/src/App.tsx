import ProjectTile from './components/ProjectTile';
import AppTextLogo from './components/AppTextLogo';
import ProjectSearchBar from './components/ProjectSearchBar';
import NavBar from './components/NavBar';

function App() {
  return (
    <>
      <div className="bg-[#121212] w-screen h-screen flex items-center justify-start flex-col gap-5">
        <div className='flex flex-col items-center justify-start'>
          <NavBar />
          <div className='flex flex-col items-center justify-start text-white w-[60vw]'>
            <div className='searchbar flex flex-col items-center justify-start w-full'>
              <AppTextLogo />
              <ProjectSearchBar />
            </div>
          </div>
        </div>
        <main className='flex items-center justify-center w-full h-100%'>
          <div className='flex items-start justify-start w-[60vw] h-full'>
            <ProjectTile />
          </div>
        </main>
      </div>
    </>
  );
}

export default App;