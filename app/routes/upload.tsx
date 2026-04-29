import Navbar from "~/components/Navbar";
import {type FormEvent, useState} from "react";
import FileUploader from "~/components/FileUploader";
import {usePuterStore} from "~/lib/putter";
import {useNavigate} from "react-router";
import {convertPdfToImage} from "~/lib/pdf2Img";
import {generatedUUID} from "~/lib/Utils";
import {prepareInstructions} from "~/index";

const upload = () => {
    const{auth, isLoading, fs, ai, kv} = usePuterStore();
    const[isProcessing, setIsProcessing] = useState(false);
    const[statusText, setStatusText] = useState("");
    const[file, setFile] = useState<File | null>(null);
    const navigate = useNavigate();

    const handleFileSelect  = (file: File | null) => {
        setFile(file);
    }

    const handleAnalyse = async({companyName, jobTitle, jobDescription, file }:{companyName:string, jobTitle: string, jobDescription:string, file:File})=>{
        setIsProcessing(true);
        setStatusText("Uploading the file...");
        const uploadedFile = await fs.upload([file]);

        if(!uploadedFile) return setStatusText("Error: Failed to upload file...");

        setStatusText("Converting to Image...");

        const imageFile = await convertPdfToImage(file);
        console.log("Image" + imageFile);
        if(!imageFile.file) return setStatusText("Error: Failed to convert PDF2Image");

        setStatusText("Uploading image...");

        const uploadedImage = await fs.upload([imageFile.file]);
        if(!uploadedImage) return setStatusText("Error: Failed to uploadedImage");

        setStatusText("Preparing data");
        const uuid = generatedUUID();
        const data=  {
            id : uuid,
            resumePath : uploadedFile.path,
            imagePath : imageFile.file,
            companyName,
            jobTitle,
            jobDescription,
            feedback:''
        }
        await kv.set(`resume:${uuid}`, JSON.stringify(data));
        console.log(uuid);
        setStatusText("Analysing");

        const feedback = await ai.feedback(
            uploadedFile.path,
            prepareInstructions({jobTitle, jobDescription})
        );

        if(!feedback) return setStatusText("Error: Failed to Analyse Resume");
        const feedbackTxt = typeof feedback.message.content === 'string'
            ? feedback.message.content
            : feedback.message.content[0].text;

        const cleanedFeedback = feedbackTxt
            .replace(/```json/g, '')  // remove ```json
            .replace(/```/g, '')      // remove closing ```
            .trim();                  // remove whitespace

        try {
            data.feedback = JSON.parse(cleanedFeedback);
        } catch (err) {
            console.error("Raw AI response:", feedbackTxt); // 👈 shows what AI actually returned
            return setStatusText("Error: Failed to parse AI feedback");
        }
        //
        // if(!response.ok) return setStatusText("Error: Failed to Analyse Resume");
        // const result = await response.json();
        // const feedbacktext = result.candidates[0].content.parts[0].text;
        // data.feedback = JSON.parse(feedbacktext);
        console.log(uuid);
        await kv.set(`resume:${uuid}`, JSON.stringify(data));
        setStatusText("Analyse Complete, redirecting");
        navigate(`/resume/${uuid}`)
    }


    const handleSubmit = (e:FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget.closest('form');
        if(!form) return;
        const formData = new FormData(form);
        const companyName = formData.get('company-name') as string;
        const jobTitle = formData.get('job-title') as string;
        const jobDescription = formData.get('job-description') as string;
        if(!file) {
            return;
        }

        handleAnalyse({companyName, jobTitle, jobDescription, file});

    }
    return(
        <main className="bg-[url('/images/bg-main.svg')] bg-cover">
            <Navbar />
            <section className = "main-section">
                <div className="page-heading py-16">
                    <h1>Smart Feedback for your dream job.</h1>
                    {isProcessing ? (
                        <>
                           <h2>{statusText}</h2>
                            <img src="/images/resume-scan-2.gif" className="w-full"/>
                        </>
                    ) : (<h2>Drop your Resume for an ATS Score and Improvement tips</h2>)}
                    {!isProcessing && (
                        <form className="flex flex-col gap-4 mt-8" id = "upload-form" onSubmit={handleSubmit}>
                            <div className="form-div">
                                <label htmlFor="company-name">Company Name</label>
                                <input type='text' name = "company-name" placeholder="Company Name" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-title">Job Title</label>
                                <input type='text' name = "job-title" placeholder="Job Titile" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-description">Job Description</label>
                                <textarea rows={5} name = "job-description" placeholder="Job Description" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="uploaded">Upload Resume</label>
                                <FileUploader onFileSelect={handleFileSelect} />
                            </div>
                            <button className="primary-button" type="submit">Analyse Resume</button>

                        </form>
                    )}

                </div>

            </section>
        </main>
    )
}
export default upload;
