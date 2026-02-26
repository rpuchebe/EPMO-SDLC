import LoginClient from './LoginClient'

export default async function LoginPage(props: {
    searchParams: Promise<{ message?: string; success?: string }>
}) {
    const searchParams = await props.searchParams
    return <LoginClient message={searchParams?.message} success={searchParams?.success} />
}
